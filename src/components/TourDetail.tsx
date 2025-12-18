import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tour, Booking } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RoomConfiguration } from './RoomConfiguration';
import { MapPin, Clock, Users, Calendar as CalendarIcon, ArrowLeft, CreditCard, AlertCircle, Sparkles, Shield, Minus, Plus } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

type RoomConfig = {
  id: string;
  single: number;
  double: number;
  twin: number;
  priceDifference: number;
};

type TourDetailProps = {
  tour: Tour;
  onBookingComplete: (bookingData: any) => Promise<void>;
  onBack?: () => void;
};

export function TourDetail({ tour, onBookingComplete, onBack }: TourDetailProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [adults, setAdults] = useState<number>(2);
  const [childrenWithBed, setChildrenWithBed] = useState<number>(0);
  const [childrenWithoutBed, setChildrenWithoutBed] = useState<number>(0);
  const [selectedRoomConfig, setSelectedRoomConfig] = useState<RoomConfig | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalTravelers = adults + childrenWithBed + childrenWithoutBed;
  const totalChildren = childrenWithBed + childrenWithoutBed;
  const totalPaxForRooms = adults + childrenWithBed; // People who need beds

  // Get selected departure data from schedule
  const getSelectedDeparture = () => {
    if (!selectedDate || !tour.departureSchedule?.departures) return null;
    return tour.departureSchedule.departures.find(d => d.date === selectedDate);
  };

  const selectedDeparture = getSelectedDeparture();

  // Calculate price based on pax tier (use departure-specific pricing if available)
  const getPriceForPax = (pax: number) => {
    const pricingTiers = selectedDeparture?.pricingTiers || tour.pricingTiers;
    
    if (!pricingTiers || pricingTiers.length === 0) {
      return selectedDeparture?.pricePerPerson || tour.pricePerPerson || 0;
    }
    const tier = pricingTiers.find(t => t.pax === pax) || pricingTiers[pricingTiers.length - 1];
    return tier?.pricePerPerson || selectedDeparture?.pricePerPerson || tour.pricePerPerson || 0;
  };

  const pricePerPerson = getPriceForPax(adults);
  const basePrice = Math.round(adults * pricePerPerson);
  
  // Use departure-specific child pricing if available
  const childWithBedPrice = selectedDeparture?.childWithBed || tour.childWithBed;
  const childWithoutBedPrice = selectedDeparture?.childWithoutBed || tour.childWithoutBed;
  const childrenPrice = Math.round(childrenWithBed * childWithBedPrice + childrenWithoutBed * childWithoutBedPrice);
  const roomPrice = selectedRoomConfig ? Math.round(selectedRoomConfig.priceDifference) : 0;
  
  // Use departure-specific addons if available
  const availableAddons = selectedDeparture?.addons || tour.addons;
  const addonsPrice = Math.round(selectedAddons.reduce((sum, addonId) => {
    const addon = availableAddons.find((a) => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0));
  const totalPrice = Math.round(basePrice + childrenPrice + roomPrice + addonsPrice);

  // Parse available dates and group by year/month
  const availableDatesData = tour.availableDates.map(dateStr => new Date(dateStr));
  
  // Show only current year and next year
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Get price for a specific month and check if it's past, future, or has departures
  const getMonthStatus = (year: number, month: number) => {
    const now = new Date();
    const monthDate = new Date(year, month, 1);
    const hasDateInMonth = availableDatesData.some(
      d => d.getFullYear() === year && d.getMonth() === month
    );
    
    if (hasDateInMonth) {
      return { status: 'available', price: pricePerPerson };
    } else if (monthDate < new Date(now.getFullYear(), now.getMonth(), 1)) {
      // Past month without departures
      return { status: 'sold_out', price: null };
    } else {
      // Future month without departures
      return { status: 'coming_soon', price: null };
    }
  };

  // Get available dates for selected month/year
  const getAvailableDatesForMonth = () => {
    return tour.availableDates.filter(dateStr => {
      const date = new Date(dateStr);
      return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    });
  };

  const availableDatesInMonth = getAvailableDatesForMonth();

  // Reset room config when passenger count changes
  const handlePassengerChange = () => {
    setSelectedRoomConfig(null);
  };

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Helper functions for booking data
  const calculateBasePrice = () => basePrice;
  const calculateChildrenPrice = () => childrenPrice;
  const calculateAddonsTotal = () => addonsPrice;

  const handleBooking = async () => {
    setError('');

    if (!selectedDate) {
      setError('Please select a departure date');
      return;
    }
    if (!selectedRoomConfig && adults > 0) {
      setError('Please select a room configuration');
      return;
    }
    if (totalTravelers < tour.minTravelers) {
      setError(`Minimum ${tour.minTravelers} travelers required`);
      return;
    }
    if (totalTravelers > tour.maxTravelers) {
      setError(`Maximum ${tour.maxTravelers} travelers allowed`);
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      setError('Please fill in all contact details');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare booking data
      const bookingData = {
        tourId: tour.id,
        tourSlug: tour.slug,
        tourName: tour.name,
        customerName,
        customerEmail,
        customerPhone,
        departureDate: selectedDate,
        adults,
        childrenWithBed,
        childrenWithoutBed,
        roomConfiguration: selectedRoomConfig || {},
        addons: selectedAddons,
        basePrice: calculateBasePrice(),
        childrenPrice: calculateChildrenPrice(),
        roomPrice: selectedRoomConfig?.priceDifference || 0,
        addonsPrice: calculateAddonsTotal(),
        totalPrice,
        specialRequests: ''
      };

      // Call parent's booking handler (which handles payment or test mode)
      await onBookingComplete(bookingData);
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateRange = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleBackClick = () => { if (onBack) { onBack(); 
  } else { 
  // Redirect back to the WordPress tours listing page 
  window.location.href = 'https://immersivetrips.in'; } };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" onClick={handleBackClick} className="mb-6 hover:bg-blue-50">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tours
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tour Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={tour.featuredImage || tour.image || 'https://immersivetrips.in/wp-content/uploads/2025/10/Trip-to-himachal-image.webp'} 
              alt={tour.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', tour.featuredImage || tour.image);
                e.currentTarget.src = 'https://immersivetrips.in/wp-content/uploads/2025/10/Trip-to-himachal-image.webp';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h2 className="text-white mb-2">{tour.name}</h2>
              <div className="flex items-center gap-4 text-white/90">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tour.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {tour.duration}
                </span>
              </div>
            </div>
          </div>

          <Card className="p-8 border-0 shadow-lg">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              About This Tour
            </h3>
            <p className="text-gray-700 leading-relaxed mb-6">{tour.description}</p>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="text-gray-900">{tour.location}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="text-gray-900">{tour.duration}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Group Size</div>
                  <div className="text-gray-900">
                    {tour.minTravelers} - {tour.maxTravelers} travelers
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Available Seats</div>
                  <div className="text-green-600">{tour.seatsAvailable} seats</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Date & Pricing Selector */}
          <Card className="p-6 border-0 shadow-lg">
            <h3 className="text-gray-900 mb-6">Select Your Departure</h3>
            
            {/* Year Selector */}
            <div className="flex items-center gap-4 mb-6 border-b pb-4">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-6 py-2 transition-all ${
                    selectedYear === year
                      ? 'text-gray-900 border-b-2 border-purple-600'
                      : 'text-gray-400'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
              {months.map((month, index) => {
                const monthInfo = getMonthStatus(selectedYear, index);
                const isSelected = selectedMonth === index;
                const isDisabled = monthInfo.status === 'sold_out' || monthInfo.status === 'coming_soon';
                
                return (
                  <button
                    key={month}
                    onClick={() => !isDisabled && setSelectedMonth(index)}
                    disabled={isDisabled}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-sm text-gray-900">{month}</div>
                    {monthInfo.status === 'sold_out' && (
                      <div className="text-xs text-red-500 mt-1">Sold out</div>
                    )}
                    {monthInfo.status === 'coming_soon' && (
                      <div className="text-xs text-blue-500 mt-1">Coming Soon</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Available Dates for Selected Month */}
            <div>
              <h4 className="text-gray-900 mb-4">
                Tours / {months[selectedMonth]} {selectedYear}
              </h4>
              <div className="space-y-3">
                {availableDatesInMonth.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tours available for this month</p>
                ) : (
                  availableDatesInMonth.map((dateStr) => {
                    const departure = tour.departureSchedule?.departures.find(d => d.date === dateStr);
                    const departurePrice = departure?.pricePerPerson || pricePerPerson;
                    const status = departure?.status || 'available';
                    const availableSeats = departure?.availableSeats;
                    const totalSeats = departure?.totalSeats;
                    
                    return (
                      <div
                        key={dateStr}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border-2 transition-all gap-4 ${
                          selectedDate === dateStr
                            ? 'border-purple-600 bg-purple-50'
                            : status === 'sold_out'
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-gray-900">{formatDateRange(dateStr)}</div>
                            {status === 'sold_out' && (
                              <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded">
                                Sold Out
                              </span>
                            )}
                            {status === 'limited' && (
                              <span className="px-2 py-1 text-xs font-semibold text-white bg-orange-500 rounded">
                                Limited Seats
                              </span>
                            )}
                            {status === 'available' && availableSeats && (
                              <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded">
                                Available
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{tour.duration}</div>
                          {availableSeats !== undefined && totalSeats !== undefined && status !== 'sold_out' && (
                            <div className="text-xs text-gray-600 mt-1">
                              {availableSeats} of {totalSeats} seats available
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-purple-600">₹{departurePrice.toLocaleString('en-IN')}</div>
                            <div className="text-sm text-gray-500">Per person</div>
                          </div>
                          <Button
                            onClick={() => setSelectedDate(dateStr)}
                            variant={selectedDate === dateStr ? 'default' : 'outline'}
                            disabled={status === 'sold_out'}
                            className={selectedDate === dateStr ? 'bg-purple-600 hover:bg-purple-700' : ''}
                          >
                            {status === 'sold_out' ? 'Sold Out' : selectedDate === dateStr ? 'Selected' : 'Select'}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>

          {/* Passengers Section */}
          {selectedDate && (
            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-gray-900 mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Passengers
              </h3>
              
              <div className="space-y-4">
                {/* Adults */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div>
                    <div className="text-gray-900">Adults</div>
                    <div className="text-sm text-gray-500">12+ years · ₹{pricePerPerson.toLocaleString('en-IN')}/person</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setAdults(Math.max(1, adults - 1));
                        handlePassengerChange();
                      }}
                      disabled={adults <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-gray-900">{adults}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setAdults(Math.min(10, adults + 1));
                        handlePassengerChange();
                      }}
                      disabled={adults >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Children with Bed */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                  <div>
                    <div className="text-gray-900">Child with bed</div>
                    <div className="text-sm text-gray-500">2-11 years · ₹{childWithBedPrice.toLocaleString('en-IN')}/child</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setChildrenWithBed(Math.max(0, childrenWithBed - 1));
                        handlePassengerChange();
                      }}
                      disabled={childrenWithBed <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-gray-900">{childrenWithBed}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setChildrenWithBed(childrenWithBed + 1);
                        handlePassengerChange();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Children without Bed */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-pink-50 rounded-lg">
                  <div>
                    <div className="text-gray-900">Child without bed</div>
                    <div className="text-sm text-gray-500">2-11 years · ₹{childWithoutBedPrice.toLocaleString('en-IN')}/child</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setChildrenWithoutBed(Math.max(0, childrenWithoutBed - 1));
                        handlePassengerChange();
                      }}
                      disabled={childrenWithoutBed <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-gray-900">{childrenWithoutBed}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => {
                        setChildrenWithoutBed(childrenWithoutBed + 1);
                        handlePassengerChange();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Room Configuration - Only shown after date selection and passenger count */}
          {selectedDate && adults > 0 && (
            <Card className="p-6 border-0 shadow-lg">
              <RoomConfiguration
                totalPax={totalPaxForRooms}
                onSelectRoom={setSelectedRoomConfig}
                selectedConfig={selectedRoomConfig}
              />
            </Card>
          )}

          {/* Add-ons - Use departure-specific addons if available */}
          {availableAddons && availableAddons.length > 0 && (
            <Card className="p-6 border-0 shadow-lg">
              <h3 className="text-gray-900 mb-6">Enhance Your Experience</h3>
              <div className="grid gap-4">
                {availableAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedAddons.includes(addon.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                    onClick={() => handleAddonToggle(addon.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-900">{addon.name}</span>
                          <span className="text-blue-600">
                            ₹{addon.price.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {addon.description && (
                          <p className="text-gray-600 text-sm">{addon.description}</p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedAddons.includes(addon.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedAddons.includes(addon.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24 border-0 shadow-2xl bg-white">
            <div className="text-center mb-6">
              <div className="inline-block p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-3">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-gray-900">Book {tour.name}</h3>
              <p className="text-gray-500 text-sm">Secure your adventure today</p>
            </div>

            <div className="space-y-5">
              {/* Contact Details */}
              <div className="pt-4 border-t">
                <h4 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Contact Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="mb-1.5 block">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="mb-1.5 block">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-1.5 block">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="pt-4 border-t bg-gradient-to-br from-blue-50 to-purple-50 -mx-6 px-6 py-4 -mb-6">
                <h4 className="text-gray-900 mb-3">Price Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>{adults} Adult{adults !== 1 ? 's' : ''}</span>
                    <span>₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  {childrenWithBed > 0 && (
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>{childrenWithBed} Child (with bed)</span>
                      <span>₹{(childrenWithBed * childWithBedPrice).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {childrenWithoutBed > 0 && (
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>{childrenWithoutBed} Child (no bed)</span>
                      <span>₹{(childrenWithoutBed * childWithoutBedPrice).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {roomPrice !== 0 && (
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>Room Configuration</span>
                      <span className="text-gray-900">
                        {roomPrice > 0 ? '+' : ''}₹{Math.abs(roomPrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {selectedAddons.length > 0 && (
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>{selectedAddons.length} Add-on(s)</span>
                      <span>₹{addonsPrice.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-900 pt-3 border-t border-gray-300">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-lg">
                      ₹{totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleBooking}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all mt-4"
              >
                {isProcessing ? (
                  <>Processing Payment...</>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-3">
                <Shield className="h-4 w-4" />
                <span>Secure payment via HDFC Bank</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}