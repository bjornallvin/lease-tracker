# Lease Mileage Tracker

A web application to track vehicle mileage against lease limits, built with Next.js and Upstash Redis.

## Features

- Track mileage readings over time
- Monitor budget status and usage
- Calculate daily rate and projections
- Add, view, and delete mileage readings
- Responsive dashboard with real-time stats

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Upstash Redis (KV storage with JSON)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Vercel

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lease-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Upstash Redis**
   - Create an account at [Upstash](https://console.upstash.com)
   - Create a new Redis database
   - Copy your REST URL and token

4. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Upstash credentials:
     ```
     UPSTASH_REDIS_REST_URL=your_url_here
     UPSTASH_REDIS_REST_TOKEN=your_token_here
     ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add your environment variables in the Vercel dashboard:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Default Lease Configuration

The app initializes with these default values:
- **Start Date**: July 9, 2025
- **End Date**: July 9, 2028
- **Annual Limit**: 15,000 miles
- **Total Limit**: 45,000 miles

These values are stored in Redis and can be modified through the API.

## API Endpoints

- `GET /api/lease` - Get lease information
- `POST /api/lease` - Create/update lease info
- `PUT /api/lease` - Update lease info
- `GET /api/readings` - Get all mileage readings
- `POST /api/readings` - Add a new reading
- `DELETE /api/readings?id={id}` - Delete a reading

## License

MIT