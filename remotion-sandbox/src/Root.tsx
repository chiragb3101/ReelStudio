import React from "react";
import { Composition } from "remotion";
import { MotionGraphicVideo } from "./MotionGraphic";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionGraphic"
        component={MotionGraphicVideo}
        durationInFrames={1140}
        fps={30}
        width={1080}
        height={960}
      />
    </>
  );
};
