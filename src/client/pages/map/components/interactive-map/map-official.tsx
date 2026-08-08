import { useState } from 'react';
import MapModal from './map-modals';
import MapPreview from './map-preview';

export default function InteractiveMap() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="hidden lg:block flex-shrink-0 w-[400px] xl:w-[480px]">
      <MapPreview onExpand={() => setExpanded(true)} />

      {expanded && <MapModal onClose={() => setExpanded(false)} />}
    </div>
  );
}
