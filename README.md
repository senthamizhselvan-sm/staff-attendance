# QR Code Check-in Frontend

This is the frontend application for the QR Code Check-in system built with Next.js and Tailwind CSS.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Open the Application**
   Open [http://localhost:3001](http://localhost:3001) in your browser.

## Features

- **QR Code Scanning Simulation** - Simulate QR code scanning for testing
- **Staff Verification** - Verify staff identity using mobile number
- **Normal Check-in** - Standard check-in process
- **Proxy Check-in** - Check-in on behalf of absent colleagues
- **Emergency Check-in** - Emergency attendance procedures
- **Hall Assignment Display** - Show assigned halls and departments
- **Check-in Logging** - Automatic logging of all check-ins

## Backend Integration

The frontend connects to the backend API running on `http://localhost:3000`. Make sure the backend server is running before using the frontend.

## API Endpoints Used

- `GET /staff/by-mobile/:mobile_no` - Staff verification
- `GET /hall-plans` - Fetch hall assignments
- `POST /checkin-log` - Log check-ins

## Technologies Used

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Lucide React Icons 