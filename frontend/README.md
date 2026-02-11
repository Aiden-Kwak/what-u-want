# Excel Translator - Next.js Frontend

Modern, responsive frontend for the Excel Translation Service built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Modern UI/UX**: Beautiful gradient designs with dark mode support
- ⚡ **Fast Performance**: Built with Next.js App Router for optimal performance
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- 🔄 **Real-time Progress**: Live translation progress with SSE (Server-Sent Events)
- 🎯 **Type-Safe**: Full TypeScript support for better developer experience
- 🌐 **15+ Languages**: Support for multiple language pairs
- 🔒 **Secure**: API keys stored locally in browser

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3.4
- **Language**: TypeScript 5.7
- **Icons**: Heroicons (via SVG)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components
│   ├── FileUpload.tsx     # Drag & drop file upload
│   ├── LanguageSelector.tsx  # Language selection UI
│   ├── TranslationProgress.tsx  # Progress tracking
│   └── ApiKeyModal.tsx    # API key management modal
├── public/                # Static assets
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Configuration

### API Proxy

The frontend proxies API requests to the backend. Configure in `next.config.ts`:

```typescript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/api/:path*",
    },
  ];
}
```

### Environment Variables

Create a `.env.local` file (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Components

### FileUpload
Drag-and-drop file upload component with visual feedback.

### LanguageSelector
Language pair selection with swap functionality.

### TranslationProgress
Real-time progress tracking with activity logs.

### ApiKeyModal
Secure API key management with local storage.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build
docker build -t excel-translator-frontend .

# Run
docker run -p 3000:3000 excel-translator-frontend
```

## API Integration

The frontend communicates with the FastAPI backend:

- `GET /api/languages` - Fetch available languages
- `POST /api/translate` - Submit translation job
- `GET /api/logs/stream` - SSE for real-time logs
- `GET /api/download/:filename` - Download translated file

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.