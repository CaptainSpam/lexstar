/*
 * Lexstar 6000 (jQuery version)
 * By Nicholas Killewald, 2012
 */

// Define these ahead of time; we can't pass parameters into centerMap if it's
// being used as an event callback, like in window.onresize.

// Lexington will be at 2404px, 690px on the map.  Future versions of this may
// allow for other cities.  We'd need some way to convert lat/lon into pixel
// locations on this one specific map.
var defaultX = 2404;
var defaultY = 690;

var mapWidth = 3400;
var mapHeight = 1600;

var timer;

var curData;

var isCelsius = 0;

$(document).ready(initLexstar);

function initLexstar()
{
    // Perform an initial refresh.  This also sets the timer in motion.
    refreshAll();

    // refreshAll doesn't cover the Celsius toggle.
    $("#celsiustoggle").html("&deg;C");

    // If the window gets resized, we need to recenter the map.
    $(window).resize(function() { centerMap(defaultX, defaultY); });
    centerMap(defaultX, defaultY);

    // Click!
    $("#celsiustoggle").click(toggleCelsius);
    $("#centerbutton").click(centerPressed);
    $("#postopleft").click(function() { locationButton("topleft"); });
    $("#postopright").click(function() { locationButton("topright"); });
    $("#posbottomleft").click(function() { locationButton("bottomleft"); });
    $("#posbottomright").click(function() { locationButton("bottomright"); });
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
    $("#mainmap").css("background-image", "url(\"NatLoop.gif?t=" + new Date().getTime() + "\")");
}

function centerMap(x,y)
{
    var width = $(window).width();
    var height = $(window).height();
   
    // We always want to center sort of to the west of the given point.  That'll
    // allow us to see incoming storm fronts.
    var centerX = x - Math.floor((4 * width) / 5);
    var centerY = y - Math.floor(height / 2);

    // Make sure we keep the image filling the entire window.  If, for instance,
    // we want to center on San Jose, we want the left edge of the map to be
    // the ultimate left side of the display, regardless of how little of the
    // incoming weather we'd see.
    if(centerX < 0)
    {
        centerX = 0;
    }

    if(centerY < 0)
    {
        centerY = 0;
    }

    if((mapWidth - width) < centerX)
    {
        centerX = mapWidth - width;
    }

    if((mapHeight - height) < centerY)
    {
        centerY = mapHeight - height;
    }

    $("#mainmap").css("left", -centerX + "px").css("top", -centerY + "px");

    // Since this is called as a result of resizing the window, make sure the
    // draggable limits are also updated.
    $("#mainmap").draggable({
        containment: [-(mapWidth - width), -(mapHeight - height), 0, 0],
        start: startMapDrag,
        stop: stopMapDrag
        });
}

function setCity(name)
{
    $("#cityname").html(name);
}

function setImage(url)
{
    // Sometimes, we don't GET any icon.  Account for it!
    if(url === "??????" || url === "???")
    {
        $("#conditionimage").css("background-image", "url(\"weathericons/UnknownWeather.png\")");
    }
    else
    {
        $("#conditionimage").css("background-image", "url(\"weathericons/" + url + "\")");
    }
}

function setConditionText(text)
{
    $("#conditiontext").html(text);
}

function setTemperature(temp, isCelsius)
{
    $("#conditiontemperature").html(temp + "&deg; " + (isCelsius ? "C" : "F"));
}

function setTime(timeString)
{
    $("#timeaccessed").html(timeString);
}

function setCredit(name, link)
{
    if(name != undefined && name != "")
    {
        $("#creditlink").html("Data courtesy <a href=\"" + link + "\">" + name + "</a>");
    }
    else
    {
        $("#creditlink").html("");
    }

}

function setWind(direction, speed, gust, isCelsius)
{
    // Make sure these are numbers.  The numeric comparison sort of fails in
    // some cases otherwise.
    speed = Number(speed).valueOf();
    gust = Number(gust).valueOf();

    // If the wind is just plain dead, report it as "Calm".
    if(speed == 0)
    {
        $("#conditionwindspeed").html("Wind: Calm");
    }
    else
    {
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
        $("#conditionwindspeed").html("Wind: " + abbreviateDirection(direction) + " at " + speed + (isCelsius ? " KPH" : " MPH"));

        // Gusts are only shown if they exist.
        if(gust > speed)
        {
            $("#conditionwindgust").css("display", "block").html("(with gusts up to " + gust + (isCelsius ? " KPH" : " MPH") + ")");
        }
        else
        {
            $("#conditionwindgust").css("display", "none");
        }
    }
}

function setPressure(press, isCelsius)
{
    $("#conditionpressure").html("Pressure: " + press + (isCelsius ? " mb" : " In. Hg"));
}

function setDewpoint(dew, isCelsius)
{
    $("#conditiondewpoint").html("Dewpoint: " + dew + "&deg; " + (isCelsius ? "C" : "F"));
}

function setHumidity(perc)
{
    $("#conditionhumidity").html("Humidity: " + perc + "%");
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
    $("#conditions").css("display", "none");
    $("#statusarea").css("display", "block").html("Loading data...");
    
    setTime("");
    setCredit("", "");

    // Now, fire off a connection!  Screw you, JSLint, I'll break up my long
    // lines any way I damn well please!
    $.ajax({
        url: "KLEX.xml?t=" + new Date().getTime(),
        success: weatherDataSuccess,
        dataType: "xml"
    });
}

function displayF()
{
    // Now, the image and the local conditions.
    setImage(getSimpleElementText(curData, "icon_url_name", "???"));
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
    setImage(getSimpleElementText(curData, "icon_url_name", "???"));
    setConditionText(getSimpleElementText(curData, "weather", "Unknown Conditions"));
    setTemperature(getSimpleElementText(curData, "temp_c", "???"), true);

    // The wind should be broken apart a bit.
    setWind(getSimpleElementText(curData, "wind_dir", "???"), getSimpleElementText(curData, "wind_mph", "???"), getSimpleElementText(curData, "wind_gust_mph", "???"), true);

    // We'll use millibars for pressure.
    setPressure(getSimpleElementText(curData, "pressure_mb", "???"), true);

    // Dew!
    setDewpoint(getSimpleElementText(curData, "dewpoint_c", "???"), true);

    // Humidity!
    setHumidity(getSimpleElementText(curData, "relative_humidity", "???"));

    // More data!  MOAR!
    setTime(getSimpleElementText(curData, "observation_time", "unknown time"));
}

function weatherDataSuccess(data)
{
    $("#conditions").css("display", "block");
    $("#statusarea").css("display", "none");

    // Let's get some data!
    curData = data.documentElement;

    // First, the location name.  This is probably going to be Blue Grass
    // Airport.  If it isn't, that would be interesting indeed.
    setCity(getSimpleElementText(curData, "location", "Unknown Location"));

    // Credit!  It's due!  And it's due here!
    setCredit("NOAA", getSimpleElementText(curData, "credit_URL", "http://weather.gov"));

    // Now, the real data!  Which we'll hand off to other methods based on what
    // mode we're in.
    if(isCelsius)
    {
        displayC();
    }
    else
    {
        displayF();
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
    var boxelem = $("#forecast");
    // MOVE!
    switch(clicked)
    {
        case 'topleft':
            boxelem.css("left", "16px").css("right", "auto").css("top", "16px").css("bottom", "auto");
            break;
        case 'topright':
            boxelem.css("left", "auto").css("right", "16px").css("top", "16px").css("bottom", "auto");
            break;
        case 'bottomleft':
            boxelem.css("left", "16px").css("right", "auto").css("top", "auto").css("bottom", "16px");
            break;
        case 'bottomright':
            boxelem.css("left", "auto").css("right", "16px").css("top", "auto").css("bottom", "16px");
            break;
    }
}

function toggleCelsius()
{
    // Toggle the value...
    isCelsius = !isCelsius;

    // ... then re-render.
    if(isCelsius)
    {
        displayC();
        $("#celsiustoggle").html("&deg;F");
    }
    else
    {
        displayF();
        $("#celsiustoggle").html("&deg;C");
    }
}

function centerPressed()
{
    centerMap(defaultX, defaultY);
}

function startMapDrag()
{
    $("#forecast").css("opacity", "0.25");
    $("#locationtext").css("opacity", "0.25");
}

function stopMapDrag()
{
    $("#forecast").css("opacity", "1.0");
    $("#locationtext").css("opacity", "1.0");
}
