import React from "react";
import { Text, TextProps, Platform } from "react-native";

interface SelectableTextProps extends TextProps {
  children: React.ReactNode;
}

/**
 * A Text component that allows text selection and copying.
 * On iOS, long press to select. On Android, long press to select.
 */
export const SelectableText: React.FC<SelectableTextProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <Text
      selectable={true}
      selectionColor={Platform.OS === "android" ? "#5FD4F480" : undefined}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
};

export default SelectableText;
