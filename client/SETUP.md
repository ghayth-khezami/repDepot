# Client Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- pnpm
- Backend server running on `http://localhost:3000`

## Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
pnpm install
```

## Development

Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

## Features

### Pages Available

1. **Dashboard** (`/`) - Overview with statistics
2. **Products** (`/products`) - Product management with filters
3. **Categories** (`/categories`) - Category CRUD operations
4. **Clients** (`/clients`) - Client management
5. **Co-Clients** (`/co-clients`) - Co-client management
6. **Users** (`/users`) - User management

### ReusableTable Features

- **Search**: Real-time search across table data
- **Filters**: Custom filter dropdowns (e.g., category, isDepot for products)
- **Pagination**: Page navigation with configurable page size (10, 25, 50, 100)
- **Actions**: Edit and delete buttons per row
- **Add Button**: Optional add button to create new records

### Modal Forms

- Add/Update forms appear in modal popups
- Responsive design
- Form validation
- Auto-close on successful submission

## API Integration

All API calls are handled through RTK Query:
- Automatic caching
- Optimistic updates
- Loading states
- Error handling

## Styling

The UI is styled with Tailwind CSS to match the Figma design:
- Purple to orange gradient sidebar
- Clean white cards
- Modern rounded corners
- Smooth transitions

## Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.
