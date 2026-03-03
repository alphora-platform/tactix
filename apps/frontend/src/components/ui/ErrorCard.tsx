import { AlertCircle } from 'lucide-react';

interface ErrorCardProps {
  message?: string;
  retry?: () => void;
}

export function ErrorCard({ message = 'Something went wrong', retry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-accent-red/30 bg-accent-red/5 p-8 text-center">
      <AlertCircle size={32} className="text-accent-red" />
      <p className="text-text-secondary text-sm">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-1 rounded-lg border border-accent-red/40 px-4 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
