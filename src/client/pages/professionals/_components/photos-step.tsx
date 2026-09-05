import type { Errors, Photos } from './apply-payload';
import ApplyStep from './apply-step';
import PhotoCapture, { type Capture } from './photo-capture';

type Props = {
  photos: Photos;
  onChange: (which: keyof Photos) => (capture: Capture | null) => void;
  errors: Errors;
};

const NOTE =
  'All three are taken through the camera on this device. Line each one up inside the outline: once it holds, the camera counts down from three and takes the photo itself.';

export default function PhotosStep({ photos, onChange, errors }: Props) {
  return (
    <ApplyStep step={2} title="Photographs, taken now" note={NOTE}>
      <div className="grid gap-4 lg:grid-cols-3">
        <PhotoCapture
          label="Your face"
          hint="Look straight at the camera, somewhere with even light."
          facing="user"
          guide="face"
          value={photos.portrait}
          onChange={onChange('portrait')}
          error={errors.portrait}
        />
        <PhotoCapture
          label="PRC licence, front"
          hint="Fill the frame with the card. The licence number has to be readable."
          facing="environment"
          guide="card"
          value={photos.licenseFront}
          onChange={onChange('licenseFront')}
          error={errors.licenseFront}
        />
        <PhotoCapture
          label="PRC licence, back"
          hint="The same card, turned over."
          facing="environment"
          guide="card"
          value={photos.licenseBack}
          onChange={onChange('licenseBack')}
          error={errors.licenseBack}
        />
      </div>
    </ApplyStep>
  );
}
