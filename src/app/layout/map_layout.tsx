import React from 'react'
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import { Outlet } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
const ACCESS_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;
const MapLayout = () => {
    return (
        <Map
            reuseMaps
            initialViewState={{
                longitude: 101.4918194,
                latitude: 12.5352438,
                zoom: 5,
            }}
            style={{ width: '100vw', height: '100vh' }}
            mapStyle="mapbox://styles/mapbox/standard-satellite"
            mapboxAccessToken={ACCESS_TOKEN}
            projection={'mercator'}
        >
            <Source
                id="mapbox-dem"
                type="raster-dem"
                url="mapbox://mapbox.mapbox-terrain-dem-v1"
                tileSize={512}
                maxzoom={14}
            />
            <Outlet />
            {/* <Layer
                id="terrain"
                type="raster"
                source="mapbox-dem"
                exaggeration={1.5}
            /> */}
        </Map>
    )
}

export default MapLayout
