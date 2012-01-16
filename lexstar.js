"use strict";
/*
 * Lexstar 6000
 * By Nicholas Killewald, 2012
 */

// Define these ahead of time; we can't pass parameters into centerMap if it's
// being used as an event callback, like in window.onresize.

// Lexington will be at 2404px, 690px on the map.  Future versions of this may
// allow for other cities.  We'd need some way to convert lat/lon into pixel
// locations on this one specific map.
var defaultX = 2404;
var defaultY = 690;

var timer;

var xmlHttp;
var curData;

var isCelsius = 0;

function initLexstar()
{
    // Perform an initial refresh.  This also sets the timer in motion.
    refreshAll();

    // refreshAll doesn't cover the Celsius toggle.
    document.getElementById("celsiustoggle").innerHTML = "&deg;C";

    // If the window gets resized, we need to recenter the map.
    window.onresize = centerMap;
}

function refreshAll()
{
    clearTimeout(timer);
    reloadMap();
    reloadData();

    // Then, we refresh the whole thing every 15 minutes.
    timer = setTimeout(refreshAll, 900000);
}

function reloadMap()
{
    var mapelem = document.getElementById("mainmap");
    mapelem.style.backgroundImage = "url(\"NatLoop.gif?t=" + new Date().getTime() + "\")";
    centerMap();
}

function centerMap()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    var mapelem = document.getElementById("mainmap");
   
    // We always want to center sort of to the west of the given point.  That'll
    // allow us to see incoming storm fronts.
    var centerX = defaultX - Math.floor((4 * width) / 5);
    var centerY = defaultY - Math.floor(height / 2);

    mapelem.style.backgroundPosition = -centerX + "px " + -centerY + "px";
}

function setCity(name)
{
    var nameelem = document.getElementById("cityname");

    nameelem.innerHTML = name;
}

function setImage(url)
{
    var imageelem = document.getElementById("conditionimage");

    // Sometimes, we don't GET any icon.  Account for it!
    if(url === "??????" || url === "???")
    {
        imageelem.style.backgroundImage = "url(\"UnknownWeather.png\")";
    }
    else
    {
        imageelem.style.backgroundImage = "url(\"" + url + "\")";
    }
}

function setConditionText(text)
{
    var textelem = document.getElementById("conditiontext");

    textelem.innerHTML = text;
}

function setTemperature(temp, isCelsius)
{
    var tempelem = document.getElementById("conditiontemperature");

    tempelem.innerHTML = temp + "&deg; " + (isCelsius ? "C" : "F");
}

function setTime(timeString)
{
    var timeelem = document.getElementById("timeaccessed");

    timeelem.innerHTML = timeString;
}

function setWind(direction, speed, gust, isCelsius)
{
    var windelem = document.getElementById("conditionwindspeed");
    var gustelem = document.getElementById("conditionwindgust");

    // If this is Celsius, also assume metric.  Convert!
    if(isCelsius)
    {
        speed = speed * 1.609344;
        gust = gust * 1.609344;

        var num1 = new Number(speed);
        var num2 = new Number(gust);

        speed = num1.toFixed(1);
        gust = num2.toFixed(1);
    }

    // Wind is always shown.
    windelem.innerHTML = "Wind: " + abbreviateDirection(direction) + " at " + speed + (isCelsius ? " KPH" : " MPH");

    // Gusts are only shown if they exist.
    if(gust > speed)
    {
        gustelem.style.display = "block";
        gustelem.innerHTML = "(with gusts up to " + gust + (isCelsius ? " KPH" : " MPH") + ")";
    }
    else
    {
        gustelem.style.display = "none";
    }
}

function setPressure(press, isCelsius)
{
    var presselem = document.getElementById("conditionpressure");

    presselem.innerHTML = "Pressure: " + press + (isCelsius ? " mb" : " In. Hg");
}

function setDewpoint(dew, isCelsius)
{
    var dewelem = document.getElementById("conditiondewpoint");

    dewelem.innerHTML = "Dewpoint: " + dew + "&deg; " + (isCelsius ? "C" : "F");
}

function setHumidity(perc)
{
    var humelem = document.getElementById("conditionhumidity");

    humelem.innerHTML = "Humidity: " + perc + "%";
}

function fixToTwoDigits(input)
{
    // This just fixes a one-digit input to something zero-padded.
    if(input < 10)
    {
        return "0" + input;
    }
    else
    {
        return input;
    }
}

function abbreviateDirection(dir)
{
    var dirL = dir.toLowerCase();

    // Abbreviate!  If we don't know this direction, don't abbreviate it.
    if(dirL === "north")
    {
        return "N"
    }
    if(dirL === "northeast")
    {
        return "NE"
    }
    if(dirL === "east")
    {
        return "E"
    }
    if(dirL === "southeast")
    {
        return "SE"
    }
    if(dirL === "south")
    {
        return "S"
    }
    if(dirL === "southwest")
    {
        return "SW"
    }
    if(dirL === "west")
    {
        return "W"
    }
    if(dirL === "northwest")
    {
        return "NW"
    }

    // If all else fails...
    return dir;
}

function reloadData()
{
    // Start a reload in progress.  Also, hide the current conditions and show
    // the status indicator.
    document.getElementById("conditions").style.display = "none";
    var statuselem = document.getElementById("statusarea");
    
    statuselem.style.display = "block";
    statuselem.innerHTML = "Loading data...";
    
    setTime("");

    // Now, fire off a connection!
    xmlHttp = new XMLHttpRequest();
    // This file is refreshed via cron job.  We can't open it from remote in
    // the context of JavaScript, for fairly good reason.
    xmlHttp.open("GET", "KLEX.xml?t=" + new Date().getTime(), true);
    xmlHttp.setRequestHeader("Access-Control-Allow-Origin","*");
    xmlHttp.onreadystatechange = conditionsStateChange;
    xmlHttp.send();
}

function displayF()
{
    // Now, the image and the local conditions.
    setImage(getSimpleElementText(curData, "icon_url_base", "???") + getSimpleElementText(curData, "icon_url_name", "???"));
    setConditionText(getSimpleElementText(curData, "weather", "Unknown Conditions"));
    setTemperature(getSimpleElementText(curData, "temp_f", "???"), false);

    // The wind should be broken apart a bit.
    setWind(getSimpleElementText(curData, "wind_dir", "???"), getSimpleElementText(curData, "wind_mph", "???"), getSimpleElementText(curData, "wind_gust_mph", "???"), false);

    // We'll use inches of mercury as pressure.
    setPressure(getSimpleElementText(curData, "pressure_in", "???"), false);

    // Dew!
    setDewpoint(getSimpleElementText(curData, "dewpoint_f", "???"), false);

    // Humidity!
    setHumidity(getSimpleElementText(curData, "relative_humidity", "???"));

    // More data!  MOAR!
    setTime(getSimpleElementText(curData, "observation_time", "unknown time"));
}

function displayC()
{
    // Now, the image and the local conditions.
    setImage(getSimpleElementText(curData, "icon_url_base", "???") + getSimpleElementText(curData, "icon_url_name", "???"));
    setConditionText(getSimpleElementText(curData, "weather", "Unknown Conditions"));
    setTemperature(getSimpleElementText(curData, "temp_c", "???"), true);

    // The wind should be broken apart a bit.
    setWind(getSimpleElementText(curData, "wind_dir", "???"), getSimpleElementText(curData, "wind_mph", "???"), getSimpleElementText(curData, "wind_gust_mph", "???"), true);

    // We'll use inches of mercury as pressure.
    setPressure(getSimpleElementText(curData, "pressure_mb", "???"), true);

    // Dew!
    setDewpoint(getSimpleElementText(curData, "dewpoint_c", "???"), true);

    // Humidity!
    setHumidity(getSimpleElementText(curData, "relative_humidity", "???"));

    // More data!  MOAR!
    setTime(getSimpleElementText(curData, "observation_time", "unknown time"));
}

function conditionsStateChange()
{
    if(xmlHttp.readyState === 4 && xmlHttp.status === 200)
    {
        document.getElementById("conditions").style.display = "block";
        document.getElementById("statusarea").style.display = "none";

        // Let's get some data!
        curData = xmlHttp.responseXML.documentElement;

        // First, the location name.  This is probably going to be Blue Grass
        // Airport.  If it isn't, that would be interesting indeed.
        setCity(getSimpleElementText(curData, "location"));

        // Now, the real data!  Which we'll hand off to other methods based on
        // what mode we're in.
        if(isCelsius)
        {
            displayC();
        }
        else
        {
            displayF();
        }
    }
}

/**
 * Gets the first child's node value from the given element, or the fallback
 * parameter if that node is undefined.
 */
function getSimpleElementText(docElement, name, fallback)
{
    var elem = docElement.getElementsByTagName(name)[0];

    if(elem == undefined)
    {
        return fallback;
    }
    else
    {
        return docElement.getElementsByTagName(name)[0].firstChild.nodeValue;
    }
}

function locationButton(clicked)
{
    var boxelem = document.getElementById("forecast");
    // MOVE!
    switch(clicked)
    {
        case 'topleft':
            boxelem.style.left = '1em';
            boxelem.style.right = 'auto';
            boxelem.style.top = '1em';
            boxelem.style.bottom = 'auto';
            break;
        case 'topright':
            boxelem.style.left = 'auto';
            boxelem.style.right = '1em';
            boxelem.style.top = '1em';
            boxelem.style.bottom = 'auto';
            break;
        case 'bottomleft':
            boxelem.style.left = '1em';
            boxelem.style.right = 'auto';
            boxelem.style.top = 'auto';
            boxelem.style.bottom = '1em';
            break;
        case 'bottomright':
            boxelem.style.left = 'auto';
            boxelem.style.right = '1em';
            boxelem.style.top = 'auto';
            boxelem.style.bottom = '1em';
            break;
    }
}

function toggleCelsius()
{
    // Toggle the value...
    isCelsius = !isCelsius;

    // ... then re-render.

    var cButton = document.getElementById("celsiustoggle");
    if(isCelsius)
    {
        displayC();
        cButton.innerHTML = "&deg;F";
    }
    else
    {
        displayF();
        cButton.innerHTML = "&deg;C";
    }
}
