import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import COLORS from '../../theme/colors';
import TYPOGRAPHY from '../../theme/typography';
import SPACING from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [secureText, setSecureText] = useState(isPassword);

  const borderColor = error
    ? COLORS.ERROR
    : focused
    ? COLORS.PRIMARY
    : COLORS.CARD_BORDER;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          { borderColor },
          focused && styles.focusedContainer,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...props}
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          placeholderTextColor={COLORS.TEXT_MUTED}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          secureTextEntry={secureText}
          selectionColor={COLORS.PRIMARY}
          cursorColor={COLORS.PRIMARY}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setSecureText((s) => !s)}
          >
            <Text style={styles.eyeIcon}>{secureText ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 6 } as ViewStyle,
  label: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    letterSpacing: 0.3,
  } as TextStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE_2,
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    borderWidth: 1.5,
    height: 52,
    paddingHorizontal: SPACING.LG,
    gap: SPACING.SM,
  } as ViewStyle,
  focusedContainer: {
    backgroundColor: `${COLORS.PRIMARY}08`,
  } as ViewStyle,
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    height: '100%',
  } as TextStyle,
  inputWithLeft: { paddingLeft: 4 } as TextStyle,
  leftIcon: { marginRight: 4 } as ViewStyle,
  rightIcon: { padding: 4 } as ViewStyle,
  eyeIcon: { fontSize: 16 } as TextStyle,
  error: {
    color: COLORS.ERROR,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '500',
  } as TextStyle,
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  } as TextStyle,
});

export default Input;
