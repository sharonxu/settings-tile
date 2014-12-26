# In Development 
#Data cleaning: example process for shapefiles and csv listed. 
#Two functions: for one pair of points, intersect() finds all intersections with two vectors of latitude and longitude.
# getCoord() uses intersect() to return straight line intersections between two vectors of latitude and longitude. 
# In this example, (x,y) are wildlife points from a csv and (X,Y) are road points from a shapefile. In getCoord() delind1() is an option to delete unwanted pairs of points by indices, here used to delete wildlife coordinates measured four or more hours apart. 

library(rgeos)
library(maptools)
library(ggplot2)
library(plyr) 
library(rgdal)    

#Optional: Add road name and other identifying variables
mapa <- readOGR(dsn=".",layer="shapefile_name")
mapa@data$id <- rownames(mapa@data)
mapa.df <- fortify(mapa)
road <- join(mapa.df,mapa@data, by="id")
road$NAMEALL <- as.factor(road$NAMEALL)

p5 <- read.csv("GPS.csv", header=T)

x <- p5$Longitude
y <- p5$Latitude
xbuff <- .05*(max(x) - min(x)); ybuff <- .05*(max(y) - min(y))
minX <- min(x)-xbuff; maxX <- max(x)+xbuff; minY <- min(y)-ybuff; maxY <- max(y)+ybuff; 
road <- road[road$long>=minX & road$long<=maxX & road$lat>=minY & road$lat<=maxY,]

# sort by date and time, delete pairs of points with time differences >4 hours
p5 <- p5[order(as.Date(p5$GMTDate, format="%m/%d/%Y"),p5$GMTTime),]
time <- diff(p5$GMTTime)
day <- diff(as.Date(p5$GMTDate, format = "%m/%d/%Y"))
delind1 <- which(day>1)
time1 <- p5$GMTTime[-length(p5$GMTTime)];time2 <- p5$GMTTime[-1]
delind <- c(delind1, which(time>400 & day==0), which(abs(time1-2400)+abs(time2-2400)>400 & time > 400 & day==1)) # delete pairs (delind1, delind1+1)

# Take two animal data points at times t1:(x1,y1) and t2: (x2,y2).
# For pair road coordinates (X,Y) s.t. x1 <= X <= x2 && y1 <= Y <= y2:
# Find equations Y = m(x - x1) + y1 for straight line paths from wildlife points and from road points. For each set of wildlife points (x1, x2), check for intersection with any road point. Set both Y's equal to each other and find X. If X is between x1 and x2, then there is an intersection.

#for 1 set of wildlife points (x1,y1), calculate all road points (X1,Y1)
intersect <- function(m, x1, y1, x2, y2, m.r, X1, Y1, X2, Y2, X1b, Y1b, X2b, Y2b){
  # y - y1 = m(x - x1)
  # m(x - x1)+y1 = m.r(x - X1) + Y1 
  # x= (m*x1 - m.r*X1 + Y1 - y1)/(m-m.r)
  if (m==-Inf || is.na(m)){ 
    return #no movement whatsoever in x direction or NA, exclude for now
    # for p5, all such cases where change in x was 0, change in y was also 0.
  }
  
  x1 <- rep(1,length(Y1)) %*% t.default(x1)
  y1 <- rep(1,length(Y1)) %*% t.default(y1)
  m <- rep(1,length(Y1)) %*% t.default(m)
  
  X <- (m*x1 - m.r*X1 + Y1 - y1)/(m-m.r)
  X[is.na(X)] <- X1[is.na(X)] # for m.r=0 when X1==X2
  #check if road coordinate intersection is (X1, Y)
  Y <- m*(X - x1) + y1
  
  # to be able to construct the boxes without 8 if else statements, set x1 as lower bound:
  x <- c(x1,x2); x1 <- min(x); x2 <- max(x)
  
  if (length(X[X>=x1 & X<=x2 & X>=X1b & X<=X2b & Y>=y1 & Y<=y2 & Y>=Y1b & Y<=Y2b])==0) return 
  return(cbind(X[X>=x1 & X<=x2 & X>=X1b & X<=X2b & Y>=y1 & Y<=y2 & Y>=Y1b & Y<=Y2b], 
               Y[X>=x1 & X<=x2 & X>=X1b & X<=X2b & Y>=y1 & Y<=y2 & Y>=Y1b & Y<=Y2b])) 
}

#Defaults are set so that no points are deleted select at most one out of delind1 and group1 - delind is to specify specific indices of pairs for deletion, group is to separate by group for shapefiles. Deleting a pair: (x1,y1), (x2,y2), (x3,y3). You can delete the pair (x2,y2), (x3,y3) while still keeping pair (x1,y1), (x2,y2).

getCoord <- function(x, y, X, Y, delind1,  delind2, group1, group2){
  
  x1 <- x[-length(x)]; y1 <- y[-length(y)]
  x2 <- x[-1]; y2 <- y[-1]  
  if (missing(delind1)){
    #group1 is chosen for (x,y)
    skip <- diff(as.numeric(group1))
    delind1 = which(skip!=0)
  }
  m <- (diff(y)/diff(x))[-delind1]
  x1 <- x1[-delind1]; y1 <- y1[-delind1]
  x2 <- x2[-delind1]; y2 <- y2[-delind1]
  
  X1 <- X[-length(X)]; Y1 <- Y[-length(Y)]
  X2 <- X[-1]; Y2 <- Y[-1]  
  if (missing(delind2)){
    #group2 is chosen for (X,Y)
    skip <- diff(as.numeric(group2))
    delind2 = which(skip!=0)
  }
  m.r <- (diff(Y)/diff(X))[-delind2]
  X1 <- X1[-delind2]; Y1 <- Y1[-delind2]
  X2 <- X2[-delind2]; Y2 <- Y2[-delind2]
  
  Xb <- cbind(X1,X2)
  Yb  <- cbind(Y1,Y2)
  X2b <- apply(Xb, 1, max); X1b <- apply(Xb, 1, min) 
  Y2b <- apply(Yb, 1, max); Y1b <- apply(Yb, 1, min)   
  coord <- mapply(intersect, m=m, x1=x1, y1=y1, x2=x2, y2=y2, 
                  MoreArgs=list(m.r=m.r, X1=X1, Y1=Y1, X2=X2, Y2=Y2, 
                                X1b=X1b, Y1b=Y1b, X2b=X2b, Y2b=Y2b))
  coord <- do.call(rbind.data.frame, coord)
  names(coord) <- c("latitude","longitude")
  return(coord)
}

coord = getCoord(x, y,road[, 1], road[, 2], delind1=delind, group2=road$group)


plot(coord$latitude, coord$longitude, col="blue", cex=1)
points(road[,1],road[,2], cex=.1)
str(coord)

