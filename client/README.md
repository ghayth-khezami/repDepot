# DEPOT Client - React Frontend

React + TypeScript + Vite frontend application for the DEPOT management system.

## Features

- **Modern UI**: Inspired by the Figma design with gradient sidebar and clean interface
- **RTK Query**: Efficient API state management with caching and automatic refetching
- **Reusable Components**: Table component with search, filters, and pagination
- **Modal Forms**: Add and update operations in popup modals
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Modern styling with custom color scheme matching the design

## Installation

```bash
cd client
pnpm install
```

## Development

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

Make sure the backend server is running on `http://localhost:3000`

## Build

```bash
pnpm build
```

## Project Structure

```
client/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ReusableTable.tsx
│   │   └── Modal.tsx
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx
│   │   ├── UsersPage.tsx
│   │   ├── ClientsPage.tsx
│   │   ├── CoClientsPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   └── ProductsPage.tsx
│   ├── store/          # Redux store and API slices
│   │   ├── api/
│   │   │   ├── baseApi.ts
│   │   │   ├── userApi.ts
│   │   │   ├── clientApi.ts
│   │   │   ├── coClientApi.ts
│   │   │   ├── categoryApi.ts
│   │   │   └── productApi.ts
│   │   └── store.ts
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx
│   └── main.tsx
```

## Available Pages

- **Dashboard** (`/`) - Overview with statistics cards
- **Users** (`/users`) - User management (view, update, delete)
- **Clients** (`/clients`) - Client management (create, view, delete)
- **CoClients** (`/co-clients`) - Co-client management (create, view, delete)
- **Categories** (`/categories`) - Category management (create, view, update, delete)
- **Products** (`/products`) - Product management (view, update, delete) with filters

## Features by Module

### ReusableTable Component
- Search functionality
- Custom filters
- Pagination with page size selection
- Action buttons per row
- Loading and empty states

### Modal Component
- Responsive sizing (sm, md, lg, xl)
- Form handling
- Close on backdrop click
- Scrollable content

### API Integration
All API calls use RTK Query with:
- Automatic caching
- Optimistic updates
- Error handling
- Loading states

## Styling

The application uses Tailwind CSS with a custom color scheme:
- Primary colors (purple): `primary-*`
- Secondary colors (orange): `secondary-*`

The sidebar uses a gradient from `primary-600` to `secondary-500` matching the Figma design.
