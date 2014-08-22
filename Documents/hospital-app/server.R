library(reshape2)
library(ggplot2)
library(RColorBrewer)

sur <- read.csv("survey.csv", stringsAsFactors=F)

sur <- (sur[,c(1:8,seq(11,29,3))])
names(sur) <- c("id", "name", "address", "city", "state", "zip", "county", "cnurse", "cdoctor", "cstaff", "pain", "cmed", "cleanquiet", "discharge", "overall")

for (i in 8:15){
  sur[i] <- apply(sur[i], 2, function(x) as.numeric(substr(x,1,1)))
}

m <- melt(sur, id.vars=c("id", "name", "address", "city", "zip","state", "county"))
c <- brewer.pal(8, "Spectral")

shinyServer(function(input, output) {
  
  output$plot1 <- renderPlot({ 
    
    name1 <- toupper(input$name)
    hospital <- subset(m, name==name1)
    attach(hospital)
    
    barplot(value, col=c, names.arg=c("Comm. w/Nurse", "Comm. w/Doctor", "Comm. w/Staff", "Pain Mgmt.", "Comm. about Meds", "Clean/Quiet", "Discharge Info", "Overall"), cex.names=.9, ylim=c(0,10)) 

})

})