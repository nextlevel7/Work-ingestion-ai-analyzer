import { useId } from 'react'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import type { WorkItem } from '../types/work-item'

export function AnalysisResult({ item }: { item: WorkItem }) {
  const headingId = useId()
  return (
    <section className="grid gap-3 border-t border-slate-200 pt-5" aria-labelledby={headingId}>
      <h3 id={headingId}>AI analysis</h3>
      <p className="muted">Analysis attempts: {item.analysisAttemptCount}</p>

      {item.status === 'RECEIVED' && (
        <p>Analysis has not started. Analyse this item to get a summary and recommended action.</p>
      )}
      {item.status === 'ANALYSING' && (
        <p className="notice" role="status">Analysis is in progress. Refresh items to check for results.</p>
      )}
      {item.status === 'FAILED' && (
        <ErrorMessage>
          <strong>Analysis failed.</strong>
          <p className="whitespace-pre-wrap wrap-anywhere">{item.analysisError || 'No error details were returned. Please retry the analysis.'}</p>
        </ErrorMessage>
      )}
      {(item.status === 'READY_FOR_REVIEW' || item.status === 'COMPLETED') && (
        <>
          <dl className="grid gap-4">
            <div><dt className="muted mb-1">Category</dt><dd className="m-0">{item.category || 'Not provided'}</dd></div>
            <div><dt className="muted mb-1">Priority</dt><dd className="m-0">{item.priority || 'Not provided'}</dd></div>
            <div><dt className="muted mb-1">Summary</dt><dd className="whitespace-pre-wrap wrap-anywhere">{item.summary || 'Not provided'}</dd></div>
            <div><dt className="muted mb-1">Recommended action</dt><dd className="whitespace-pre-wrap wrap-anywhere">{item.recommendedAction || 'Not provided'}</dd></div>
          </dl>
          {item.status === 'READY_FOR_REVIEW' && <p>Review the AI results and carry out any required action before completing this item.</p>}
        </>
      )}
    </section>
  )
}
