import { expect, test } from 'bun:test';
import { testRender } from '@opentui/react/test-utils';
import { act, createElement } from 'react';
import { AsciiMotionTuiEffects } from '../src/ascii-motion-tui-effects.tsx';

type PlaybackControls = {
  play: () => void;
  pause: () => void;
  restart: () => void;
};

test('renders and plays an exported animation', async () => {
  const playback: { current?: PlaybackControls } = {};
  const setup = await testRender(
    createElement(AsciiMotionTuiEffects, {
      autoPlay: false,
      onReady: (controls) => {
        playback.current = controls;
      },
    }),
    { width: 80, height: 30 }
  );

  try {
    await act(async () => {
      await setup.renderOnce();
    });

    const firstFrame = setup.captureCharFrame();
    expect(firstFrame.trim()).not.toBe('');

    const controls = playback.current;
    if (!controls) {
      throw new Error('Animation did not provide playback controls');
    }

    await act(async () => {
      controls.play();
    });

    let nextFrame = firstFrame;
    const deadline = Date.now() + 1000;
    while (nextFrame === firstFrame && Date.now() < deadline) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      await act(async () => {
        await setup.renderOnce();
      });
      nextFrame = setup.captureCharFrame();
    }

    await act(async () => {
      controls.pause();
    });
    expect(nextFrame).not.toBe(firstFrame);

    await act(async () => {
      controls.restart();
      controls.pause();
    });
    await act(async () => {
      await setup.renderOnce();
    });
    expect(setup.captureCharFrame()).toBe(firstFrame);
  } finally {
    await act(async () => {
      setup.renderer.destroy();
    });
  }
});
