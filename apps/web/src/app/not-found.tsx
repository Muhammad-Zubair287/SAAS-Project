import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-canvas">
      <h1 className="text-display-md text-brand-navy-950">404</h1>
      <p className="mt-4 text-body-lg text-gray-500">Page not found</p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-brand-blue-600 px-4 py-2 text-body-md text-white hover:bg-brand-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-600"
      >
        Go home
      </Link>
    </div>
  );
}
