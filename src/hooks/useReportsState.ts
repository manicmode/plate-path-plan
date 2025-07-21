
import { useReducer, useCallback } from 'react';

interface ReportFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  publicUrl: string;
  weekEndDate: string;
}

interface ReportsState {
  reports: ReportFile[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  selectedReport: ReportFile | null;
  showPreview: boolean;
  initialized: boolean;
}

type ReportsAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_REPORTS'; payload: ReportFile[] }
  | { type: 'SET_SELECTED_REPORT'; payload: ReportFile | null }
  | { type: 'SET_SHOW_PREVIEW'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET_STATE' };

const initialState: ReportsState = {
  reports: [],
  isLoading: false,
  isGenerating: false,
  error: null,
  selectedReport: null,
  showPreview: false,
  initialized: false
};

const reportsReducer = (state: ReportsState, action: ReportsAction): ReportsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_REPORTS':
      return { 
        ...state, 
        reports: action.payload, 
        isLoading: false, 
        error: null,
        initialized: true 
      };
    case 'SET_SELECTED_REPORT':
      return { ...state, selectedReport: action.payload };
    case 'SET_SHOW_PREVIEW':
      return { ...state, showPreview: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

export const useReportsState = () => {
  const [state, dispatch] = useReducer(reportsReducer, initialState);

  const actions = {
    setLoading: useCallback((loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }), []),
    setGenerating: useCallback((generating: boolean) => 
      dispatch({ type: 'SET_GENERATING', payload: generating }), []),
    setError: useCallback((error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }), []),
    setReports: useCallback((reports: ReportFile[]) => 
      dispatch({ type: 'SET_REPORTS', payload: reports }), []),
    setSelectedReport: useCallback((report: ReportFile | null) => 
      dispatch({ type: 'SET_SELECTED_REPORT', payload: report }), []),
    setShowPreview: useCallback((show: boolean) => 
      dispatch({ type: 'SET_SHOW_PREVIEW', payload: show }), []),
    setInitialized: useCallback((initialized: boolean) => 
      dispatch({ type: 'SET_INITIALIZED', payload: initialized }), []),
    resetState: useCallback(() => 
      dispatch({ type: 'RESET_STATE' }), [])
  };

  return { state, actions };
};
