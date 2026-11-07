import peta from '../../public/maps/pulau-tirta-v3-1.json';
import { bacaPeta } from './map-data';

// Satu hasil ekspor dipakai untuk render Phaser, collision, dan metadata misi.
export const PETA_RUNTIME = peta;
export const DUNIA = bacaPeta(peta);
