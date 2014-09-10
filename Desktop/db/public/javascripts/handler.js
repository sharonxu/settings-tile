var tiles=[], people=[];
var varData=[], superVarData=[];
var sourceDropDown=[{name: '---',value:'',subitems: []}];
var varUsage={names:[],amounts:[],dataIn:[],dimensions:[], sources:[], bounds:[]};
var superUsage={names:[],amounts:[],dataIn:[], dimensions:[], dependancies:[], sources:[]};
var stateDimension=0;
var statesJson={};
var cfilter, all;
var supersList=[];
var completion=0;
var gridster;
var chartType, dataset;
var tableItems=0;

$(document).ready(function(){
    $(".gridster ul").gridster({
        widget_margins: [0, 0],
        widget_base_dimensions: [200, 250/3],
		max_cols:7
    });
	$("text").css({"color":"white"})
    gridster = $(".gridster ul").gridster().data('gridster');
	
    loadData();
})

function formatTable()
{
	if(tableItems<4)
	{
		var temp={};
		tableItems++
		$('.addtable').remove();
		$('.tablebody').append('Select Data Source: <select id="colsource'+tableItems+'" name="col'+tableItems+'"></select></br>');
		$('.tablebody').append('Select Data Variable:<select id="colvar'+tableItems+'" name="col'+tableItems+'"></select></br>');
		$('.tablebody').append('<div class="fa-stack fa-lg addtable"><i class="fa fa-circle fa-stack-2x"></i><i class="fa fa-inverse fa-stack-1x">+</i></div>');
		
		$.each(sourceDropDown, function(){
			$("<option />")
			.attr("value", this.value)
			.html(this.name)
			.appendTo("#colsource"+tableItems);
			temp[this.value] = this.subitems;
		});
		
		$("#colsource"+tableItems).change(function(){
			var value = $(this).val();
			var key=this.id.substring(9);
			var menu = $("#colvar"+key);
			
			menu.empty();
			$.each(temp[value], function(){
				$("<option />")
				.attr("value", this.value)
				.html(this.name)
				.appendTo(menu);
			});
		}).change();
		$('.addtable').click(function(){
			formatTable();
		});
	}
}

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function findSource(name)
{
	for(var j in sourceDropDown)
	{
		if(sourceDropDown[j].value==name)
			return j;
	}
	
	return -1;
}

function populateDropdown()
{
    var temp = {};
    $("#datasource").html("");
    $("#datavar").html("");
    $.each(sourceDropDown, function(){
        $("<option />")
        .attr("value", this.value)
        .html(this.name)
        .appendTo("#datasource");
        temp[this.value] = this.subitems;
    });
    
    $("#datasource").change(function(){
        var value = $(this).val();
        var menu = $("#datavar");
        
        menu.empty();
        $.each(temp[value], function(){
            $("<option />")
            .attr("value", this.value)
            .html(this.name)
            .appendTo(menu);
        });
    }).change();
};

function selectChart(dataset)
{
	var index=findVariable('super', dataset);
	$('#addstart').modal('hide');
	chartType=null;
	
		//quantitative
		if(index==-1)
		{console.log('quant')
			$('#addquant').modal('show');
		}
		
		//qualitative
		else
		{console.log('qual')
			$('#addqual').modal('show');
		}
}

function findVariable (dataClass, varName)
{
	if(dataClass=='super')
		for(var j in superUsage.names)
		{
			if(superUsage.names[j]==varName)
				return j;
		}
	else	
		for(var j in varUsage.names)
		{
			if(varUsage.names[j]==varName)
				return j;
		}
	
	console.error("ERROR: Invalid dataset name");
	return -1;
}



function getDimension(dataset, datatype,chart) 
{
    var index=findVariable (datatype, dataset);
	var url='var';
	var variables=varUsage;
	if(datatype=='super')
	{
		variables=superUsage;
		url='super'
	}
	variables['amounts'][index]+=1;
	if(variables['amounts'][index]>1)
	{
		finishGen(variables['dimensions'][index],chart, index, dataset)
	}
	else
	{
		getData(dataset,function(arg, ind, datast, dataType){
			arg[0]['dimensions'][ind]= cfilter.dimension(function (d) {
				return d[datast];
			});
			
			finishGen(arg[0]['dimensions'][ind],arg[1], ind, datast)
		
		},[variables, chart]);
	}
} 

function getData(datasets, callback, args)
{
	var datasource=superUsage;
	var url='super';
	var dataIndex=findVariable ('super', datasets);
	if(dataIndex<0)
	{
		dataIndex=findVariable ('base', datasets);
		datasource=varUsage;
		url='var'
	}
	if(dataIndex<0)
	{
		console.error("Incorrect dataset: "+datasets[curIndex])
	}
	else
	{
		if(datasource.dataIn[dataIndex])
		{
			callback(args, dataIndex, datasets, url);
		}
		else
		{
			datasource.dataIn[dataIndex]=true;
			$.getJSON('users/'+url+'/'+datasets, function(d){
				var data=d[0].data;
				addData(url, datasets, data);
				if(url!='super')
				{
					var min=Number.MAX_VALUE;
					var max=-1*Number.MAX_VALUE;
					for(var j in data)
					{
						if(data[j]>max&&data[j]!=-999)
							max=data[j];
						if(data[j]<min&&data[j]!=-999)
							min=data[j]
					}
					varUsage.bounds[dataIndex][0]=min;
					varUsage.bounds[dataIndex][1]=max;
				}
				callback(args, dataIndex, datasets, url);
			});
		}
	}
}

function finishGen(dimension, chart, index, dataset)
{
    if(chart.typeName!='geo')
	{
		chart.cDimension=dimension;
		chart.cGroup=chart.cDimension.group().reduce(
			function reduceAdd(p,v){
				if(v[dataset]!=-999)
					return p+1000;
				return p;
			},
			function reduceRemove(p,v){
				if(v[dataset]!=-999)
					return p-1000;
				return p;
			},
			function reduceInitial(){
				return 0;
			}
		);
	}
	if(chart.typeName=='hist')
	{
		var bounds=varUsage.bounds[index];
		chart.x(d3.scale.linear().domain(bounds))
		.xUnits(function(){return 50})
		var binWidth=(bounds[1]-bounds[0])/100;
		chart.cGroup=chart.cDimension.group(function(d){return Math.floor(d/binWidth)*binWidth}).reduce(
			function reduceAdd(p,v){
				if(v[dataset]!=-999)
					return p+1;
				return p;
			},
			function reduceRemove(p,v){
				if(v[dataset]!=-999)
					return p-1;
				return p;
			},
			function reduceInitial(){
				return 0;
			}
		);
	}
	else if(chart.typeName=='box')
	{
		var bounds=varUsage.bounds[index];
		var dist=bounds[1]-bounds[0];
		console.log(bounds)
		console.log(dist)
		chart.x(d3.scale.linear().domain([bounds[0]-dist*.25,bounds[1]+dist*.25]))
	}
	if(chart.typeName=='geo')
	{
		var bounds=varUsage.bounds[index];
		console.log(bounds);
		chart.cDimension=stateDimension;
		chart.cGroup=chart.cDimension.group().reduce(
		function reduceAdd(p,v){
				if(v[dataset]!=-999)
				{
					p.sum+=v[dataset];
					p.amount++;
					p.avg=p.sum/p.amount;
				}
				return p;
			},
			function (p,v){
				if(v[dataset]!=-999)
				{
					p.sum-=v[dataset];
					p.amount--;
					p.avg=p.sum/p.amount;
				}
				return p;
			},
			function (){
				return {sum:0,amount:0,avg:0}
			}
		)
		chart
			.valueAccessor(function (p) {
				return p.value.avg;
			})
			.colorDomain(bounds)
	}
	chart
        .dimension(chart.cDimension) // set dimension
        .group(chart.cGroup) // set group
    dc.renderAll();
		console.log("HIIIIIIIIII!!!")
}


function addData(datatype, dataset, data)
{
 	for(var person in people)
	{
		var fipcode=people[person].fip;
		if(datatype=='super')
		{
			var distribution=data[fipcode];
			var key=Math.random();
			var index=0;
			while(key>distribution[index])
			{
				index++;
			}
			people[person][dataset]=superUsage['dependancies'][findVariable (datatype, dataset)][index];
		}
		else
		{
			people[person][dataset]=data[fipcode];
		}
		
	} 
}

function tileSizes(t)
{
    switch(t)
    {
        case 'pie':
        case 'row':
        case 'donut':
            return [1,1,1,1];
            break;
		case 'hist':
		case 'box':
			return [1,1,2,1];
			break;
		case 'geo':
			return [1,1,2,1];
			break;
    }
}

function titleGen(chart, data)
{
    switch(chart)
    {
        case 'pie':
            return 'Pie Chart of '+data.split("_").join(' ').toProperCase();
            break;
        case 'row':
            return 'Bar Graph of '+data.split("_").join(' ').toProperCase();
            break;
        case 'donut':
            return 'Donut Chart of '+data.split("_").join(' ').toProperCase();
            break;
        case 'hist':
            return 'Histogram of '+data.split("_").join(' ').toProperCase();
            break;
        case 'geo':
            return 'Theme Chart of '+data.split("_").join(' ').toProperCase();
            break;
        case 'box':
            return 'Box Plot of '+data.split("_").join(' ').toProperCase();
            break;
    }
}

function pieGen(dataset, idcode, colorKey)
{
    var chart = dc.pieChart('#'+idcode);
	chart.typeName='pie';
    chart
        .width(180) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .radius(80) // define pie radius
        .ordinalColors(colorKey)
        .label(function (d) {
            if (chart.hasFilter() && !chart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key.split("_").join(' ') + "(" + Math.floor(d.value / all.value()/10) + "%)";
        });
	getDimension(dataset, 'super',chart) 
	return chart;
}

function barGen(dataset, idcode, colorKey)
{
    var chart = dc.rowChart('#'+idcode);
	chart.typeName='bar';
    chart.width(180)
        .height(180)
        .ordinalColors(colorKey)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .label(function (d) {
            return d.key.split("_").join(' ');
        })
        // title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().tickFormat(function(d){return "";});
	getDimension(dataset, 'super',chart) 
	return chart;
}

function donutGen(dataset, idcode, colorKey)
{
    var chart = dc.pieChart('#'+idcode);
	chart.typeName='donut';
    chart
        .width(180) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .radius(80) // define pie radius
        .innerRadius(30)
        .ordinalColors(colorKey)
        .label(function (d) {
            if (chart.hasFilter() && !chart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key.split("_").join(' ') + "(" + Math.floor(d.value / all.value()/10) + "%)";
        });
	getDimension(dataset, 'super',chart) 
	return chart;
}

function histGen(dataset, idcode, colorKey)
{
	var chart = dc.barChart('#'+idcode);
	chart.typeName='hist';
    chart
        .width(180*2) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .ordinalColors(colorKey)
        .label(function (d) {
            if (chart.hasFilter() && !chart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key + "(" + Math.floor(d.value / all.value()/10) + "%)";
        })
		.elasticY(true)
		.x(d3.scale.linear().domain([0,5000000]))
		.round(dc.round.floor)
		.alwaysUseRounding(true);
	getDimension(dataset, 'base',chart) 
	return chart;
}

function geoGen(dataset, idcode, colorKey)
{
	if(stateDimension===0)
	{
		stateDimension=cfilter.dimension(function(d){
			return (Math.floor(Number(d.fip.substring(3))/1000))
		})
		
		$.getJSON('geojson/statesSmall.json', function(d){
			statesJson=d;
			var chart = dc.geoChoroplethChart('#'+idcode);
			chart.typeName='geo';
			chart
				.width(180*3+20) // (optional) define chart width, :default = 200
				.height(200/3*5+30) // (optional) define chart height, :default = 200
				.projection(d3.geo.albersUsa().scale(700).translate([300, 180]))
				.colors(d3.scale.quantize().range(colorKey))
                .colorCalculator(function (d) { return d ? chart.colors()(d) : '#ccc'; })
				.title(function (d) {
					return d.value;
				})
				.overlayGeoJson(statesJson.features, "state", function (d) {
					return String(Number(d.id));
				});
				getData(dataset,function(arg, ind, datast, dataType){
					finishGen(arg[0]['dimensions'][ind],arg[1], ind, datast)
				},[varUsage, chart]);
			return chart;
		})
	}
	else
	{
		var chart = dc.geoChoroplethChart('#'+idcode);
		chart.typeName='geo';
		chart
				.width(180*3+20) // (optional) define chart width, :default = 200
				.height(200/3*5+30) // (optional) define chart height, :default = 200
				.projection(d3.geo.albersUsa().scale(700).translate([300, 180]))
				.colors(d3.scale.quantize().range(colorKey))
				.title(function (d) {
					return d.value;
				})
				.overlayGeoJson(statesJson.features, "state", function (d) {
					return String(Number(d.id));
				});
				getData(dataset,function(arg, ind, datast, dataType){
					finishGen(arg[0]['dimensions'][ind],arg[1], ind, datast)
				},[varUsage, chart]);
		return chart;
	}
}


function boxGen(dataset, idcode, colorKey)
{
	var chart = dc.boxPlot('#'+idcode);
	chart.typeName='box';
    chart
        .width(180*2) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .ordinalColors(colorKey)
        .label(function (d) {
            if (chart.hasFilter() && !chart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key + "(" + Math.floor(d.value / all.value()/10) + "%)";
        })
		.elasticY(true)
		.x(d3.scale.linear().domain([0,5000000]))
		.round(dc.round.floor)
	getDimension(dataset, 'base',chart) 
	return chart;
}

function chartGen(chartType, dataset, idcode, colorKey)
{   
	var colorList=[];
    for(var j=0;j<9;j++)
        colorList.push(tinycolor("hsl(" + colorKey + ', 100%, '+(45+j*5)+'%)').toHexString());
    switch(chartType)
    {
        case 'pie':
            return pieGen(dataset, idcode, colorList)
            break;
        case 'row':
            return barGen(dataset, idcode, colorList)
			break;
        case 'donut':
            return donutGen(dataset, idcode, colorList)
			break;
        case 'hist':
            return histGen(dataset, idcode, colorList)
			break;
        case 'geo':
			colorList=[];
			for(var j=0;j<=100;j++)
				colorList.push(tinycolor("hsl(" + colorKey + ', 100%, '+(j)+'%)').toHexString());
            return geoGen(dataset, idcode, colorList)
			break;
        case 'box':
            return boxGen(dataset, idcode, colorList)
			break;
    }
}

function dropTile(dropcode, chartType)
{
    switch(chartType)
    {
        case 'pie':
        case 'row':
        case 'donut':
            gridster.add_widget(dropcode, 1, 3);
            break;
		case 'hist':
		case 'box':
            gridster.add_widget(dropcode, 2, 3);
            break;
		case 'geo':
            gridster.add_widget(dropcode, 3, 5);
            break;
    }
}

function createTile(chartType, dataset)
{console.log(chartType)
     var tile={"tilenum":tiles.length};
    var dropcode="";
    var sizes=tileSizes(chartType)
    tile.colorKey=Math.floor(360*Math.random())
    tile.color="hsl(" + tile.colorKey + ", 100%, 20%)";
    tile.type=chartType;
    dropcode='<li id="tile'+tile.tilenum+'" data-row="'+sizes[0]+'" data-col="'+sizes[1]+'" data-sizex="'+sizes[2]+'" data-sizey="'+sizes[3]+'">';
    dropcode+='<div id="chart'+tile.tilenum+'"class="widget">'
    dropcode+='<strong>'+titleGen(chartType, dataset)+'</strong></br> <span style="color:'+tile.color+'">.</span>'
    dropcode+='<a class="reset" href="javascript:tiles['+tile.tilenum+'].chart.filterAll();dc.redrawAll();" style="display: none;">reset</a>'
    dropcode+='<div class="clearfix"></div>'
    dropcode+='</div>'
    dropcode+='</li>';
    dropTile(dropcode, chartType);
    $('#tile'+tile.tilenum).css({'background-color':tile.color})
    tile.chart=chartGen(chartType, dataset, 'chart'+tile.tilenum, tile.colorKey)
    tiles.push(tile)
}
function loadData()
{
   
        endLoad();
        endLoad();
        endLoad();

}

function endLoad()
{
    if(completion<2)
    {
        completion++;
        return;
    }
	cfilter=crossfilter(people);
	all=cfilter.groupAll();
	$('#add').click(function(){
        populateDropdown();
	})
    
    $('#settings').click(function(){
    
		/* $('.clickzoom').click(function(){
		console.log($(this).attr("id"))
		})

    	
    	$('#colorscheme').change(function(){
        console.log($(this).val());
    	})
    	
    	$('.detailedsources').click(function(){
    	console.log($(this).attr("id"))
		}) */
    	   	
    	
    	$('#applysettings').click(function(){
    	    $(this).siblings().each(function(index){
    			console.log(index + $(this).val())
    			console.log('ba')  			
    		})
    		
   		})
   		
    	//console.log($(this).siblings().val());
    	//console.log($(this).parent().children().val());
    	//($(this).parent()).children().attr("id")
    	
    	
    	/*parents then children - apply button has no children
    	var set1 = $(this).children().attr("id")
    	var set2 = $(this).children().val()
    	console.log($('#checkbox').prop('checked'))
    	
    	console.log($(this).children().attr("id"))
    	console.log(set3) */
    	
    	
    	/*
    	$('.checkbox').change(function(){
    		if ($(this).is(':checked'))
    			console.log('Detailed Sources On');
    		else
    			console.log('Detailed Sources Off');
    	}) */
	})
	
	$('#chartpage').click(function(){
		var val=$('#datavar').val();
		dataset=val;
		if(val!=null)
		selectChart(val)
	})
	$('.chart-button').click(function(){
		chartType=$(this).attr("id")
	})
	$('#genqual').click(function(){
		if(chartType!=null)
		{
			$('#addqual').modal('hide');
			createTile(chartType, dataset);
		}
	})
	$('#genquant').click(function(){
		if(chartType!=null)
		{
			$('#addquant').modal('hide');
			switch(chartType)
			{
				case 'table':
					tableItems=0;
					var temp={};
					$('.tablebody').html('');
					$('.tablebody').append('<select id="colsource'+0+'" name="col'+0+'"></select></br>');
					$('.tablebody').append('<select id="colvar'+tableItems+'" name="col'+tableItems+'"></select></br>');
					$('.tablebody').append('<div class="fa-stack fa-lg addtable"><i class="fa fa-circle fa-stack-2x"></i><i class="fa fa-inverse fa-stack-1x">+</i></div>');
					$('#tableconfig').modal('show');
					$.each(sourceDropDown, function(){
						$("<option />")
						.attr("value", this.value)
						.html(this.name)
						.appendTo("#colsource"+tableItems);
						temp[this.value] = this.subitems;
					});
					
					$("#colsource"+tableItems).change(function(){
						var value = $(this).val();
						var key=this.id.substring(9);
						var menu = $("#colvar"+key);
						menu.empty();
						$.each(temp[value], function(){
							$("<option />")
							.attr("value", this.value)
							.html(this.name)
							.appendTo(menu);
						});
					}).change();
					$('.addtable').click(function(){
						formatTable();
					})
					break;
				default:
					createTile(chartType, dataset);
					break;
			}
		}
	})
}