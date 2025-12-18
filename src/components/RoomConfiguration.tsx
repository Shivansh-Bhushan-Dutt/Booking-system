import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Bed, Users as UsersIcon } from 'lucide-react';

type RoomConfig = {
  id: string;
  single: number;
  double: number;
  twin: number;
  priceDifference: number;
};

type RoomConfigurationProps = {
  totalPax: number;
  onSelectRoom: (config: RoomConfig | null) => void;
  selectedConfig: RoomConfig | null;
};

// Generate all possible room combinations for a given number of passengers
function generateRoomConfigurations(pax: number): RoomConfig[] {
  const configs: RoomConfig[] = [];
  let id = 0;

  // Helper function to check if configuration is valid
  const isValid = (single: number, double: number, twin: number) => {
    return single + double * 2 + twin * 2 === pax;
  };

  // Generate all combinations
  for (let single = 0; single <= pax; single++) {
    for (let double = 0; double <= Math.floor((pax - single) / 2); double++) {
      for (let twin = 0; twin <= Math.floor((pax - single - double * 2) / 2); twin++) {
        if (isValid(single, double, twin)) {
          // Calculate base room cost (no discounts or penalties)
          // Each room configuration has a base cost
          const roomBaseCost = (single + double + twin) * 500; // ₹500 per room
          const priceDifference = roomBaseCost;

          configs.push({
            id: `config-${id++}`,
            single,
            double,
            twin,
            priceDifference,
          });
        }
      }
    }
  }

  // Sort by price (cheapest first)
  return configs.sort((a, b) => a.priceDifference - b.priceDifference);
}

export function RoomConfiguration({ totalPax, onSelectRoom, selectedConfig }: RoomConfigurationProps) {
  const [configurations, setConfigurations] = useState<RoomConfig[]>(() => generateRoomConfigurations(totalPax));

  // Regenerate configurations when totalPax changes
  useEffect(() => {
    const newConfigs = generateRoomConfigurations(totalPax);
    setConfigurations(newConfigs);
    // Reset selection when passenger count changes
    onSelectRoom(null);
  }, [totalPax, onSelectRoom]);

  const formatRoomConfig = (config: RoomConfig) => {
    const parts = [];
    if (config.single > 0) parts.push(`${config.single} x Single Room`);
    if (config.double > 0) parts.push(`${config.double} x Double Room`);
    if (config.twin > 0) parts.push(`${config.twin} x Twin Room`);
    return parts;
  };

  const getRoomTypeIcon = (type: 'single' | 'double' | 'twin') => {
    switch (type) {
      case 'single':
        return (
          <div className="flex items-center text-blue-600">
            <Bed className="h-4 w-4" />
          </div>
        );
      case 'double':
        return (
          <div className="flex items-center text-purple-600">
            <Bed className="h-4 w-4" />
            <Bed className="h-4 w-4 -ml-1" />
          </div>
        );
      case 'twin':
        return (
          <div className="flex items-center text-pink-600">
            <Bed className="h-4 w-4" />
            <Bed className="h-4 w-4 ml-1" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-900 flex items-center gap-2">
            <Bed className="h-5 w-5 text-purple-600" />
            Select Your Room Configuration
          </h3>
          <p className="text-sm text-gray-500 mt-1">Choose the room arrangement that works best for you</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full">
          <UsersIcon className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-purple-900">{totalPax} Pax</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
        {configurations.map((config) => {
          const roomParts = formatRoomConfig(config);
          const isSelected = selectedConfig?.id === config.id;
          const isRecommended = config.priceDifference === Math.min(...configurations.map(c => c.priceDifference));

          return (
            <Card
              key={config.id}
              className={`relative p-5 cursor-pointer transition-all border-2 hover:shadow-lg ${
                isSelected
                  ? 'border-purple-600 bg-purple-50 shadow-lg'
                  : 'border-gray-200 hover:border-purple-300 bg-white'
              }`}
              onClick={() => onSelectRoom(config)}
            >
              {isRecommended && !isSelected && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1 rounded-full shadow-lg z-10">
                  Best Value
                </div>
              )}
              
              <div className="space-y-3">
                {config.single > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">{config.single} x Single Room</span>
                    <div className="flex gap-1">
                      {getRoomTypeIcon('single')}
                    </div>
                  </div>
                )}
                {config.double > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">{config.double} x Double Room</span>
                    <div className="flex gap-1">
                      {getRoomTypeIcon('double')}
                    </div>
                  </div>
                )}
                {config.twin > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">{config.twin} x Twin Room</span>
                    <div className="flex gap-1">
                      {getRoomTypeIcon('twin')}
                    </div>
                  </div>
                )}

                {config.priceDifference !== 0 && (
                  <div className="text-sm pt-2 border-t text-green-600">
                    {config.priceDifference > 0 ? '+' : ''}₹{Math.abs(config.priceDifference).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {selectedConfig && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Selected Configuration:</span>
            <div className="text-right">
              <div className="text-gray-900">{formatRoomConfig(selectedConfig).join(' + ')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}