# Claude Development Notes

## Deployment
- Deployment is done manually using Vercel CLI
- Use `vercel --prod` to deploy to production

## Project Structure
- Next.js application with TypeScript
- Uses Tailwind CSS for styling
- Components located in `app/components/`
- API routes in `app/api/`

## Key Features
- Lease kilometer tracking
- Mileage charts and visualization
- Dark mode support with ThemeProvider

## Development Guidelines
- NEVER run development servers (npm run dev, etc.)
- User will handle starting/stopping servers

## PWA Setup
- PWA functionality has been implemented with manifest.json and service worker
- App icons have been created and are ready for installation
- The app can be installed as PWA on mobile devices

## Authentication
- Simple authentication system implemented for protecting add/edit functionality
- Required environment variables:
  - `ADMIN_PASSWORD` - Static password for admin access
  - `AUTH_TOKEN` - Secret token used for API authentication
- Only authenticated users can add, edit, or delete readings
- Authentication persists in localStorage
- Viewing data is always public (no auth required)