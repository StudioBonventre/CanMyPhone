import React from "react";
import { HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

export type DropGuideActivityProps = {
  title: string;
  currentStep: number;
  totalSteps: number;
  instruction: string;
  status: "guiding" | "done";
};

const DropGuideActivity = (props: DropGuideActivityProps, environment: LiveActivityEnvironment) => {
  "widget";
  const accent = environment.colorScheme === "dark" ? "#B9DCFF" : "#2E79B7";
  const secondary = environment.colorScheme === "dark" ? "#D9E5EF" : "#495B6A";

  return {
    banner: (
      <VStack modifiers={[padding({ all: 14 })]}>
        <HStack>
          <Image systemName="drop.fill" color={accent} />
          <Text modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle(accent)]}>CanMyPhone Drop Guide</Text>
        </HStack>
        <Text modifiers={[font({ weight: "bold", size: 14 })]}>{props.title}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(secondary)]}>
          Schritt {props.currentStep} von {props.totalSteps}: {props.instruction}
        </Text>
      </VStack>
    ),
    compactLeading: <Image systemName="drop.fill" color={accent} />,
    compactTrailing: <Text>{props.currentStep}/{props.totalSteps}</Text>,
    minimal: <Image systemName="drop.fill" color={accent} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 10 })]}>
        <Image systemName="drop.fill" color={accent} />
        <Text modifiers={[font({ size: 11 })]}>Drop</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ weight: "bold", size: 18 })]}>{props.currentStep}/{props.totalSteps}</Text>
        <Text modifiers={[font({ size: 10 })]}>Schritt</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: "bold", size: 13 })]}>{props.title}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>{props.instruction}</Text>
      </VStack>
    )
  };
};

export default createLiveActivity<DropGuideActivityProps>("DropGuideActivity", DropGuideActivity);
