import { AnalysisPage } from './components/pages';
import PropTypes from 'prop-types';

export default function App({ selectedQuestion = '', onBackToDashboard }) {
  return (
    <AnalysisPage selectedQuestion={selectedQuestion} onBackToDashboard={onBackToDashboard} />
  );
}

App.propTypes = {
  selectedQuestion: PropTypes.string,
  onBackToDashboard: PropTypes.func
};