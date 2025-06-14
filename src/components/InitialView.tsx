
import UploadZone from '@/components/UploadZone';

interface InitialViewProps {
  onUpload: () => void;
}

const InitialView = ({ onUpload }: InitialViewProps) => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center">
      <h1 className="text-[54px] font-bold tracking-tight mb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        Drop. <span className="bg-gradient-to-r from-orange via-red to-orange bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">Sort.</span> <span className="bg-gradient-to-r from-primary via-violet to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">Discover.</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Your mess, beautifully sorted. Organise your inspiration intelligently.
      </p>
      <UploadZone onUpload={onUpload} />
    </div>
  );
};

export default InitialView;
