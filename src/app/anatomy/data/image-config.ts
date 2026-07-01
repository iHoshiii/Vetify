export interface ImageConfig {
  src: string;
  width: number;
  height: number;
  scale: number;
}

// Default display dimensions shared across all images
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 460;
const DEFAULT_SCALE = 1;

function img(
  src: string,
  scale = DEFAULT_SCALE,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): ImageConfig {
  return { src, width, height, scale };
}

const IMAGE_CONFIG: Record<string, Partial<Record<string, ImageConfig>>> = {
  dog: {
    skeletal: img('/anatomy/dog-skeleton.png', 1.4),
    muscular: img('/anatomy/dog-muscles.png'),
    digestive: img('/anatomy/dog-digestive.png'),
    cardiovascular: img('/anatomy/dog-cardiovascular.png'),
    nervous: img('/anatomy/dog-nervous.png'),
  },
  cat: {
    skeletal: img('/anatomy/cat-skeleton.png'),
    muscular: img('/anatomy/cat-muscles.png'),
    digestive: img('/anatomy/cat-digestive.png'),
    cardiovascular: img('/anatomy/cat-cardiovascular.png'),
    nervous: img('/anatomy/cat-nervous.png'),
  },
  bird: {
    skeletal: img('/anatomy/bird-skeleton.png'),
    muscular: img('/anatomy/bird-muscles.png'),
    digestive: img('/anatomy/bird-digestive.png'),
    cardiovascular: img('/anatomy/bird-cardiovascular.png'),
    nervous: img('/anatomy/bird-nervous.png'),
  },
};

export default IMAGE_CONFIG;
