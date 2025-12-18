import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { BookingWidget } from './components/BookingWidget';
import PaymentResponse from './components/PaymentResponse';

export type Tour = {
  id: string;
  slug: string;
  name: string;
  code: string;
  description: string;
  shortDescription: string;
  location: string;
  duration: string;
  image: string;
  featuredImage: string;
  galleryImages: string[];
  priceAdult: number;
  priceChild: number;
  pricePerPerson: number;
  minTravelers: number;
  maxTravelers: number;
  seatsAvailable: number;
  availableDates: string[];
  bookingDeadline: number;
  pricingTiers: Array<{
    pax: number;
    pricePerPerson: number;
  }>;
  childWithBed: number;
  childWithoutBed: number;
  extraAdultSameRoom: number;
  tourEscortSupplement: number;
  addons: Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
  }>;
  pickupLocation?: string;
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: any;
  departureSchedule?: {
    departures: Array<{
      id: string;
      date: string;
      endDate?: string;
      duration?: string;
      pricePerPerson: number;
      totalSeats: number;
      bookedSeats: number;
      availableSeats: number;
      status: 'available' | 'limited' | 'sold_out';
      pricingTiers: Array<{
        pax: number;
        pricePerPerson: number;
      }>;
      childWithBed?: number;
      childWithoutBed?: number;
      extraAdultSameRoom?: number;
      singleRoomSupplement?: number;
      addons?: Array<{
        id: string;
        name: string;
        price: number;
        description?: string;
      }>;
    }>;
    metadata?: {
      lastUpdated?: string;
      currency?: string;
      minTravelers?: number;
      maxTravelers?: number;
    };
  };
};

export type Booking = {
  id: string;
  bookingId: string;
  tourId: string;
  tourName: string;
  date: string;
  departureDate: string;
  adults: number;
  children: number;
  addons?: string[];
  totalPrice: number;
  paymentStatus: 'confirmed' | 'pending' | 'failed';
  bookingStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  timestamp: string;
  bookingDate: string;
};

// Component to handle booking by tour ID from URL
function BookingPage() {
  const { tourId } = useParams<{ tourId: string }>();
  
  useEffect(() => {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
  }, []);

  if (!tourId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Tour</h2>
          <p className="text-gray-600">Please access this page from a valid tour link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <BookingWidget tourId={tourId} />
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        {/* Main booking route - accessed from WordPress */}
        <Route path="/book/:tourId" element={<BookingPage />} />
        
        {/* Payment response from HDFC gateway */}
        <Route path="/payment-response" element={<PaymentResponse />} />
        
        {/* Redirect root to a message or default tour */}
        <Route path="/" element={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <div className="text-center max-w-md p-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                Immersive Trips Booking
              </h1>
              <p className="text-gray-600 mb-4">
                Please access this booking system through the "Book Now" button on our tour pages.
              </p>
              <a 
                href="https://immersivetrips.in" 
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Visit Our Tours
              </a>
            </div>
          </div>
        } />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;