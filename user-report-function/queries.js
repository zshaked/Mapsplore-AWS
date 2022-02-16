exports.closestQuery = `
WITH myCoords (lat1, lng1) as (
  values (40.6125658,  -73.9070706)
),
user_reports_query AS
(
 SELECT latitude, longitude,time, crowd_estimation, 
 vincenty_distance(mc.lat1,mc.lng1,latitude,longitude) as distance_in_miles
 FROM user_reports ur,myCoords mc
 WHERE time >= NOW() - Interval '3 HOURS'
),
mta_query AS (

   WITH most_recent AS(
       WITH ms AS (
               SELECT stop_name, gtfs_longitude, gtfs_latitude,
               MIN(abs(EXTRACT(epoch FROM (NOW() - INTERVAL '7 DAY')) - EXTRACT(epoch FROM date))) as closest_time
               FROM daily_counts_2020
               GROUP BY stop_name,gtfs_latitude, gtfs_longitude
           )
           SELECT dc.stop_name, dc.date,dc.entries,dc.exits,
           dc.gtfs_longitude, dc.gtfs_latitude,dc.line,dc.daytime_routes
           FROM daily_counts_2020 dc
           INNER JOIN ms
           ON ms.stop_name = dc.stop_name
           AND ms.closest_time = abs(EXTRACT(epoch FROM (NOW() - INTERVAL '7 DAY')) - EXTRACT(epoch FROM date))
           GROUP BY dc.stop_name, dc.date,dc.entries,dc.exits,
           dc.gtfs_longitude, dc.gtfs_latitude,dc.line,dc.daytime_routes
   )
   SELECT gtfs_latitude AS latitude, gtfs_longitude as longitude, date AS time, (entries + exits) as crowd_estimation, vincenty_distance(mc.lat1, mc.lng1,gtfs_latitude,gtfs_longitude) AS distance_in_miles
   FROM most_recent mr, myCoords mc
   GROUP BY mr.stop_name, latitude, longitude, mc.lng1, mc.lat1, mr.entries,mr.exits, date
   ORDER BY distance_in_miles ASC
)
(
 SELECT * 
 FROM mta_query
 LIMIT 1
)
UNION
(
 SELECT *
 FROM user_reports_query
)

`