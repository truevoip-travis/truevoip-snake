/**
 * The federated entry point the Horizon host loads.
 *
 * This component renders nothing visible — it is a "headless remote". Its whole
 * job is to tell the host what this app contributes. Here, that is one page:
 * Snake, under the Apps menu.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  HorizonContext,
  HorizonContextProvider,
  useRemoteApp,
} from '@netsapiens/horizon-sdk';

import SnakeGamePage from './pages/SnakeGamePage';

// Injected at build time by webpack's DefinePlugin from MODULE_FEDERATION_NAME
// in webpack.config.js, so the container name lives in exactly one place.
declare const __MF_NAME__: string;

export default function App(horizonContext: HorizonContext) {
  const { sdk } = useRemoteApp(horizonContext, __MF_NAME__);

  // The host rebuilds `horizonContext` whenever the user toggles light/dark.
  // The wrapper below is memoized with empty deps so the host keeps seeing the
  // same component identity (otherwise the page remounts and the game resets).
  // This ref is what lets it still read the LATEST context at render time, so
  // the board re-themes instead of freezing on the mode it first loaded in.
  const contextRef = useRef(horizonContext);
  contextRef.current = horizonContext;

  const SnakeGamePageWithContext = useMemo(
    () =>
      function SnakeGamePageWithContext() {
        return (
          <HorizonContextProvider context={contextRef.current}>
            <SnakeGamePage />
          </HorizonContextProvider>
        );
      },
    [],
  );

  useEffect(() => {
    sdk
      .registerRoute({
        id: 'truevoip-snake',
        parentPath: '/apps',
        path: 'snake',
        label: 'Snake',
        icon: 'mdi:snake',
        placement: { first: true },
        component: SnakeGamePageWithContext,
      })
      .catch((error) =>
        console.error('[Snake] Failed to register page:', error),
      );
  }, [sdk, SnakeGamePageWithContext]);

  // Headless: all UI is injected into the host, nothing renders here.
  return null;
}
