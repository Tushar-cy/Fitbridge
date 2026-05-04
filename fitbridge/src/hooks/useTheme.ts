import { COLORS } from '../theme/colors';
import SPACING from '../theme/spacing';
import TYPOGRAPHY from '../theme/typography';

export const useTheme = () => {
  return {
    colors: COLORS,
    spacing: SPACING,
    typography: TYPOGRAPHY,
  };
};
