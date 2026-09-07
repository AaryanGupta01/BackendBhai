export interface SimulationState {
  mode:
    | 'normal'
    | 'heavy'
    | 'invalid-auth'
    | 'payment-503'
    | 'slow-payment'
    | 'cache-miss'
    | 'catalog-503'
    | 'reviews-503'
    | 'browse-slow';
  active: boolean;
  version: number;
  updatedAt: string;
}

const state: SimulationState = {
  mode: 'normal',
  active: true,
  version: 1,
  updatedAt: new Date().toISOString(),
};

export function getSimulationState(): SimulationState {
  return { ...state };
}

export function setSimulationState(next: Partial<SimulationState>): SimulationState {
  if (next.mode !== undefined) state.mode = next.mode;
  if (next.active !== undefined) state.active = next.active;
  state.version += 1;
  state.updatedAt = new Date().toISOString();
  return getSimulationState();
}

export function resetSimulationState(): SimulationState {
  return setSimulationState({ mode: 'normal', active: true });
}

export function shouldInjectSimulation(headers: Record<string, string | undefined>): SimulationState['mode'] | null {
  const effective = headers['x-simulate-mode'];
  if (effective) {
    return effective as SimulationState['mode'];
  }
  if (state.active) {
    return state.mode;
  }
  return null;
}
