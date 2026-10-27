import React, { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

import { GOOGLE_MAPS_LOADER } from "../utils/googleMaps";

const containerStyle = {
  width: "100%",
  height: "200px",
  borderRadius: "0.4rem",
  marginTop: "0.75rem",
};

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);

  const [map, setMap] = useState(null);
  const autocompleteRef = useRef(null);

  // Default center (Riyadh, Saudi Arabia based on typical Project coords in the codebase)
  const defaultCenter = { lat: 24.7136, lng: 46.6753 };

  const center =
    latitude && longitude
      ? { lat: Number(latitude), lng: Number(longitude) }
      : defaultCenter;

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance) {
    setMap(null);
  }, []);

  const fetchAddressDetails = (lat, lng) => {
    if (!window.google || !window.google.maps) {
      onLocationChange({ latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let city = "";
      let region = "";
      if (status === "OK" && results[0]) {
        for (let component of results[0].address_components) {
          const types = component.types;
          if (
            types.includes("locality") ||
            types.includes("administrative_area_level_2")
          ) {
            if (!city) city = component.long_name;
          }
          if (types.includes("administrative_area_level_1")) {
            region = component.long_name;
          }
        }
      }
      onLocationChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        city,
        region,
      });
    });
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    fetchAddressDetails(lat, lng);
  };

  const onLoadAutocomplete = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        let city = "";
        let region = "";
        if (place.address_components) {
          for (let component of place.address_components) {
            const types = component.types;
            if (
              types.includes("locality") ||
              types.includes("administrative_area_level_2")
            ) {
              if (!city) city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
              region = component.long_name;
            }
          }
        }

        onLocationChange({
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          city,
          region,
        });
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(15);
        }
      }
    }
  };

  if (loadError) {
    return (
      <div style={{ color: "red", marginTop: "1rem" }}>
        Error loading Google Maps. Make sure your API key is correct.
      </div>
    );
  }

  if (!isLoaded) {
    return <div style={{ marginTop: "1rem" }}>Loading Map...</div>;
  }

  return (
    <div style={{ position: "relative", width: "100%", marginTop: "0.5rem" }}>
      <style>{`
        .pac-container {
          z-index: 99999 !important;
          border-radius: 0.5rem;
          margin-top: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          font-family: inherit;
        }
      `}</style>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={latitude && longitude ? 15 : 10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
        }}
      >
        <Autocomplete
          onLoad={onLoadAutocomplete}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder="Search address or location..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            style={{
              boxSizing: `border-box`,
              border: `1px solid rgba(0,0,0,0.15)`,
              width: `85%`,
              height: `38px`,
              padding: `0 14px`,
              borderRadius: `0.4rem`,
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.25)`,
              fontSize: `13.5px`,
              outline: `none`,
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              maxWidth: "420px",
              background: "#ffffff",
              color: "#1e293b",
            }}
          />
        </Autocomplete>

        {latitude && longitude && (
          <Marker
            position={{ lat: Number(latitude), lng: Number(longitude) }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
