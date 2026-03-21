import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, staticFile, Series } from "remotion";

const GlowingOrb: React.FC<{
  size: number;
  color: string;
  x: number;
  y: number;
  delay: number;
}> = ({ size, color, x, y, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  const pulse = interpolate(
    Math.sin((frame - delay) * 0.1),
    [-1, 1],
    [0.8, 1.2],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}, transparent)`,
        transform: `scale(${scale * pulse})`,
        filter: 'blur(2px)',
        opacity: 0.8,
      }}
    />
  );
};

const BarChart: React.FC<{
  data: number[];
  maxHeight: number;
  delay: number;
  colors: string[];
}> = ({ data, maxHeight, delay, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const maxValue = Math.max(...data);
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 40,
      height: maxHeight,
    }}>
      {data.map((value, index) => {
        const progress = spring({
          frame: frame - delay - index * 12,
          fps,
          config: { damping: 200 },
        });
        
        const barHeight = (value / maxValue) * maxHeight * progress;
        
        return (
          <div
            key={index}
            style={{
              width: 100,
              height: barHeight,
              background: `linear-gradient(180deg, ${colors[index]}, ${colors[index]}88)`,
              borderRadius: '20px 20px 0 0',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
              border: '3px solid rgba(255,255,255,0.3)',
            }}
          />
        );
      })}
    </div>
  );
};

const Particle: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}> = ({ x, y, size, color, delay, duration }) => {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const opacity = interpolate(
    progress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const translateY = interpolate(
    progress,
    [0, 1],
    [0, -200],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const rotate = interpolate(
    progress,
    [0, 1],
    [0, 360],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent)`,
        opacity,
        transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
        filter: 'blur(1px)',
      }}
    />
  );
};

const CounterRing: React.FC<{
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  delay: number;
}> = ({ percentage, size, strokeWidth, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth / 2);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (circumference * percentage * progress) / 100;
  
  return (
    <div style={{ position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: size * 0.15,
        fontWeight: 'bold',
        color: 'white',
      }}>
        {Math.round(percentage * progress)}%
      </div>
    </div>
  );
};

const FloatingIcon: React.FC<{
  icon: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  color?: string;
}> = ({ icon, x, y, size, delay, color = 'rgba(255,255,255,0.95)' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  const float = interpolate(
    Math.sin((frame - delay) * 0.08),
    [-1, 1],
    [-15, 15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const rotate = interpolate(
    Math.sin((frame - delay) * 0.05),
    [-1, 1],
    [-10, 10],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, rgba(255,255,255,0.7))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        transform: `scale(${scale}) translateY(${float}px) rotate(${rotate}deg)`,
        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.3))',
        border: '3px solid rgba(255,255,255,0.4)',
      }}
    >
      {icon}
    </div>
  );
};

const BrainNetwork: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  const nodes = [
    { x: 540, y: 200, size: 80 },
    { x: 300, y: 300, size: 60 },
    { x: 780, y: 320, size: 60 },
    { x: 400, y: 500, size: 50 },
    { x: 680, y: 480, size: 50 },
    { x: 540, y: 600, size: 70 },
  ];
  
  const connections = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [0, 5]
  ];
  
  return (
    <div style={{ transform: `scale(${scale})` }}>
      <svg width="1080" height="960" style={{ position: 'absolute', top: 0, left: 0 }}>
        {connections.map(([start, end], i) => {
          const startNode = nodes[start];
          const endNode = nodes[end];
          const lineProgress = spring({
            frame: frame - delay - i * 8,
            fps,
            config: { damping: 200 },
          });
          
          return (
            <line
              key={i}
              x1={startNode.x}
              y1={startNode.y}
              x2={startNode.x + (endNode.x - startNode.x) * lineProgress}
              y2={startNode.y + (endNode.y - startNode.y) * lineProgress}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      
      {nodes.map((node, i) => (
        <GlowingOrb
          key={i}
          size={node.size}
          color="#4ECDC4"
          x={node.x - node.size / 2}
          y={node.y - node.size / 2}
          delay={delay + i * 15}
        />
      ))}
    </div>
  );
};

const VideoProductionVisual: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  return (
    <div style={{ transform: `scale(${scale})`, width: '100%', height: '100%' }}>
      {/* Main Screen */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 400,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: 20,
        border: '4px solid rgba(255,255,255,0.3)',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
      }}>
        {/* Video Timeline */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          right: 40,
          height: 60,
          background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1)',
          borderRadius: 10,
          opacity: 0.8,
        }} />
        
        {/* Play Button */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          transform: 'translate(-50%, -50%)',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          color: 'white',
        }}>
          ▶
        </div>
      </div>
      
      {/* Floating Elements */}
      <FloatingIcon icon="🎬" x={100} y={200} size={80} delay={delay + 40} color="#FF6B6B" />
      <FloatingIcon icon="✂️" x={900} y={300} size={70} delay={delay + 60} color="#4ECDC4" />
      <FloatingIcon icon="🎨" x={200} y={650} size={75} delay={delay + 80} color="#45B7D1" />
    </div>
  );
};

const AnalyticsVisual: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  return (
    <div style={{ transform: `scale(${scale})`, width: '100%', height: '100%' }}>
      {/* Dashboard Background */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700,
        height: 500,
        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
        borderRadius: 25,
        border: '3px solid rgba(255,255,255,0.2)',
        filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.4))',
        padding: 40,
      }}>
        {/* Chart Lines */}
        <svg width="620" height="300" style={{ position: 'absolute', top: 60, left: 40 }}>
          <polyline
            points="0,250 100,180 200,120 300,80 400,40 500,20 620,10"
            fill="none"
            stroke="#4ECDC4"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 - (1000 * spring({
              frame: frame - delay - 40,
              fps,
              config: { damping: 200 },
            }))}
          />
          <polyline
            points="0,280 100,240 200,200 300,160 400,120 500,100 620,80"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 - (1000 * spring({
              frame: frame - delay - 60,
              fps,
              config: { damping: 200 },
            }))}
          />
        </svg>
        
        {/* Data Points */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <GlowingOrb
            key={i}
            size={20}
            color="#FFD700"
            x={80 + i * 100}
            y={200 - i * 30}
            delay={delay + 80 + i * 10}
          />
        ))}
      </div>
      
      <FloatingIcon icon="📊" x={150} y={150} size={90} delay={delay + 20} color="#45B7D1" />
      <FloatingIcon icon="📈" x={850} y={200} size={85} delay={delay + 40} color="#4ECDC4" />
      <FloatingIcon icon="💹" x={200} y={750} size={80} delay={delay + 60} color="#FF6B6B" />
    </div>
  );
};

const RocketLaunch: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const rocketY = interpolate(
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 200 },
    }),
    [0, 1],
    [600, 200],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Rocket */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: rocketY,
        transform: 'translate(-50%, -50%)',
        width: 120,
        height: 200,
        background: 'linear-gradient(180deg, #FF6B6B, #FF8E53)',
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.4))',
      }} />
      
      {/* Rocket Body */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: rocketY + 50,
        transform: 'translate(-50%, -50%)',
        width: 80,
        height: 120,
        background: 'linear-gradient(180deg, #4ECDC4, #45B7D1)',
        borderRadius: '0 0 10px 10px',
        filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.4))',
      }} />
      
      {/* Flames */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: rocketY + 120,
        transform: 'translate(-50%, -50%)',
        width: 60,
        height: 100,
        background: 'linear-gradient(180deg, #FFD700, #FF6B6B)',
        clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 50% 80%, 0% 100%)',
        opacity: 0.9,
      }} />
      
      {/* Success Stars */}
      {Array.from({ length: 15 }).map((_, i) => (
        <FloatingIcon
          key={i}
          icon="⭐"
          x={200 + (i % 5) * 160}
          y={150 + Math.floor(i / 5) * 200}
          size={60 + Math.random() * 40}
          delay={delay + 60 + i * 8}
          color="#FFD700"
        />
      ))}
      
      <FloatingIcon icon="🚀" x={100} y={400} size={100} delay={delay + 40} color="#FF6B6B" />
      <FloatingIcon icon="💎" x={900} y={500} size={90} delay={delay + 80} color="#4ECDC4" />
    </div>
  );
};

export const MotionGraphicVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      overflow: 'hidden',
    }}>
      
      {/* Background Particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <Particle
          key={i}
          x={Math.random() * 1080}
          y={Math.random() * 960}
          size={Math.random() * 12 + 4}
          color={['rgba(255, 107, 107, 0.6)', 'rgba(78, 205, 196, 0.6)', 'rgba(69, 183, 209, 0.6)', 'rgba(255, 215, 0, 0.6)'][Math.floor(Math.random() * 4)]}
          delay={Math.random() * 120}
          duration={180 + Math.random() * 120}
        />
      ))}

      <Series>
        {/* Scene 1: AI Brain Network */}
        <Series.Sequence durationInFrames={190}>
          <AbsoluteFill>
            <BrainNetwork delay={30} />
            <FloatingIcon icon="🧠" x={540} y={100} size={120} delay={80} color="#4ECDC4" />
            <FloatingIcon icon="⚡" x={200} y={300} size={80} delay={120} color="#FFD700" />
            <FloatingIcon icon="🔮" x={800} y={400} size={90} delay={140} color="#FF6B6B" />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Scene 2: Video Production Studio */}
        <Series.Sequence durationInFrames={160}>
          <AbsoluteFill>
            <VideoProductionVisual delay={20} />
            <FloatingIcon icon="📱" x={100} y={500} size={85} delay={100} color="#45B7D1" />
            <FloatingIcon icon="🎯" x={900} y={600} size={80} delay={120} color="#4ECDC4" />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Scene 3: Features Grid */}
        <Series.Sequence durationInFrames={220}>
          <AbsoluteFill style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            padding: 100,
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CounterRing
                percentage={95}
                size={250}
                strokeWidth={15}
                color="#FF6B6B"
                delay={40}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CounterRing
                percentage={87}
                size={250}
                strokeWidth={15}
                color="#4ECDC4"
                delay={80}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CounterRing
                percentage={92}
                size={250}
                strokeWidth={15}
                color="#45B7D1"
                delay={120}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CounterRing
                percentage={98}
                size={250}
                strokeWidth={15}
                color="#FFD700"
                delay={160}
              />
            </div>
            
            <FloatingIcon icon="💯" x={540} y={480} size={120} delay={200} color="#FFD700" />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Scene 4: Time Savings Comparison */}
        <Series.Sequence durationInFrames={180}>
          <AbsoluteFill style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <BarChart
              data={[300, 5]}
              maxHeight={400}
              delay={60}
              colors={['#FF6B6B', '#4ECDC4']}
            />
            
            <FloatingIcon icon="⏰" x={200} y={200} size={100} delay={120} color="#FFD700" />
            <FloatingIcon icon="⚡" x={800} y={250} size={90} delay={140} color="#45B7D1" />
            <FloatingIcon icon="🎯" x={540} y={700} size={95} delay={160} color="#4ECDC4" />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Scene 5: AI Learning Analytics */}
        <Series.Sequence durationInFrames={170}>
          <AbsoluteFill>
            <AnalyticsVisual delay={30} />
            <FloatingIcon icon="🤖" x={100} y={100} size={100} delay={100} color="#4ECDC4" />
            <FloatingIcon icon="🔄" x={900} y={150} size={90} delay={120} color="#FF6B6B" />
            <FloatingIcon icon="📊" x={200} y={800} size={85} delay={140} color="#45B7D1" />
          </AbsoluteFill>
        </Series.Sequence>

        {/* Scene 6: Success and Launch */}
        <Series.Sequence durationInFrames={230}>
          <AbsoluteFill>
            <RocketLaunch delay={40} />
            
            {/* Success Explosion */}
            {Array.from({ length: 30 }).map((_, i) => (
              <Particle
                key={i}
                x={400 + Math.random() * 280}
                y={300 + Math.random() * 400}
                size={Math.random() * 16 + 6}
                color={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF8E53'][Math.floor(Math.random() * 5)]}
                delay={120 + i * 4}
                duration={120}
              />
            ))}
            
            <FloatingIcon icon="🎉" x={150} y={300} size={110} delay={160} color="#FFD700" />
            <FloatingIcon icon="✨" x={850} y={400} size={100} delay={180} color="#4ECDC4" />
            <FloatingIcon icon="🔗" x={540} y={800} size={120} delay={200} color="#FF6B6B" />
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};