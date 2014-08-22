shinyUI(fluidPage(
  titlePanel("Hospital Ratings"),
  
      helpText("See the quality of care in different aspects at over 4000 Medicare-certified hospitals across the country. Names must be exact to work."),
      
      textInput("name", label = "Hospital Name:", value ="Verde Valley Medical Center"),
    br(),
  plotOutput("plot1")
  ))