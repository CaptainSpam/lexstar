# The Lexstar 7000

Deep in the heart of central Kentucky, on a shelf in an otherwise-unassuming building on the campus of a former branch of IBM, there sits a monitor.  This monitor is connected to a computer.  This computer has been running a Chromium instance.  That Chromium instance has been pointed to this code.

This is the code for the Lexstar 7000, the finest weather Lexmark's Building 001 has to offer.

What started as a joke sometime around 2011 turned into a Javascript experiment that has survived around seven years and three lab relocations.  This simple kiosk has been dutifully reporting NOAA weather for the Lexington, KY area to employees of Lexmark ever since.  And, with this repository, it might even outlast Lexmark itself.

If you want to use this yourself, keep in mind a few things:

* This depends on a cron job downloading the appropriate NOAA weather report and forecast XML files from their servers, as well as the national precipitation map as a GIF.  Lexstar won't try to grab them on its own, as that makes for fun cross-site security issues that any sane browser will balk at.  Here's the files you want; you just need to put them into the top-level Lexstar directory with the filenames given.
  * http://www.weather.gov/xml/current_obs/KLEX.xml for the current conditions at Blue Grass Airport (as KLEX.xml),
  * http://graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?whichClient=NDFDgen&lat=38.036389&lon=-84.605833&product=glance for the forecast XML (as forecast.xml), and
  * http://radar.weather.gov/Conus/Loop/NatLoop.gif for the national precipitation map loop (as NatLoop.gif).

* It's currently entirely geared around Lexington, KY (specifically the NOAA weather station at Blue Grass Airport).  If you want it to point anywhere else, you'll have to rearrange locationdot and the map's "center" (really off to the west of center) yourself, as well as point it to different NOAA XML files.

* Everything you see here was more or less cobbled together just to make it work, and as a practice experiment for what was at the time an upcoming Javascript project at work.  It's better than some code I've seen out there, but don't expect the most efficient uses of JQuery or Javascript the world has ever seen.

* Last I knew, Firefox has major issues with garbage collection regarding reloading the national precipitation map in the background.  I honestly don't know if it still does (it did for several years with no indication on the devs' part that they had any interest in fixing it), but if you plan on running this using Firefox, be warned that it might crash after a few days.

* Alternatively, fork it and fix it yourself if you know what I'm doing wrong.
