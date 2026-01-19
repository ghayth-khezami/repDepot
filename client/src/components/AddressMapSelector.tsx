import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Search as SearchIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface AddressMapSelectorProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  onPositionConfirm?: (lat: number, lng: number) => void;
}

const MapClickHandler = ({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const DraggableMarker = ({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const eventHandlers = {
    dragend: (e: any) => {
      const marker = e.target;
      const newPosition = marker.getLatLng();
      onPositionChange(newPosition.lat, newPosition.lng);
    },
  };

  return <Marker position={position} draggable={true} eventHandlers={eventHandlers} />;
};

const AddressMapSelector = ({ value, onChange, onPositionConfirm }: AddressMapSelectorProps) => {
  // Default position (Tunis, Tunisia center)
  const defaultPosition: [number, number] = [36.8065, 10.1815];
  const [position, setPosition] = useState<[number, number]>(defaultPosition);
  const [searchValue, setSearchValue] = useState(value);
  const [mapKey, setMapKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // Use Nominatim (OpenStreetMap geocoding) for address search
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'BebeDepot/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPosition([lat, lng]);
        setMapKey((prev) => prev + 1);
        setSearchValue(result.display_name);
        onChange(result.display_name, lat, lng);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    if (searchValue && searchValue.length >= 3) {
      searchAddress(searchValue);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    // Reverse geocode using Nominatim
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'BebeDepot/1.0',
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.display_name) {
          const address = data.display_name;
          setSearchValue(address);
          onChange(address, lat, lng);
        } else {
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setSearchValue(address);
          onChange(address, lat, lng);
        }
      })
      .catch(() => {
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setSearchValue(address);
        onChange(address, lat, lng);
      });
  };

  const handleConfirm = () => {
    if (position) {
      onPositionConfirm?.(position[0], position[1]);
    }
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Rechercher une adresse..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <div className="h-full flex items-center justify-center text-gray-500">Chargement de la carte...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onChange(e.target.value);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchClick();
              }
            }}
            placeholder="Rechercher une adresse (ex: Tunis, Avenue Habib Bourguiba)..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSearchClick}
            disabled={!searchValue || searchValue.length < 3 || isSearching}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Rechercher l'adresse"
          >
            <SearchIcon className="w-4 h-4" />
            {isSearching && <span className="text-xs">...</span>}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Cliquez sur la carte ou recherchez une adresse. Vous pouvez aussi faire glisser le marqueur.
        </p>
      </div>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <MapContainer
          key={mapKey}
          center={position}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <DraggableMarker
            position={position}
            onPositionChange={(lat, lng) => {
              setPosition([lat, lng]);
              handleMapClick(lat, lng);
            }}
          />
        </MapContainer>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Confirmer la position
      </button>
    </div>
  );
};

export default AddressMapSelector;
