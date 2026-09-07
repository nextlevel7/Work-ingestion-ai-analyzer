import { useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { SubmitEvent } from 'react'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import type { CreateWorkItemInput } from '../types/work-item'

interface CreateWorkItemFormProps {
  disabled: boolean
  isSubmitting: boolean
  error: string
  onSubmit: (input: CreateWorkItemInput) => Promise<void>
  onCancel: () => void
}

export function CreateWorkItemForm({ disabled, isSubmitting, error, onSubmit, onCancel }: CreateWorkItemFormProps) {
  const [externalId, setExternalId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')

  const submitting = useRef(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || isSubmitting || submitting.current) return

    const input = {
      externalId: externalId.trim(),
      title: title.trim(),
      description: description.trim(),
    }

    if (!input.externalId || !input.title || !input.description) {
      setValidationError('All fields are required and cannot contain only spaces.')
      return
    }

    setValidationError('')
    submitting.current = true
    try {
      await onSubmit(input)
    } finally {
      submitting.current = false
    }
  }

  return (
    <div id="ingest-form">
      <form className="grid gap-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {(validationError || error) && <ErrorMessage>{validationError || error}</ErrorMessage>}
        <label>
          External ID
          <input className="control" name="externalId" value={externalId} onChange={(event) => setExternalId(event.target.value)} required maxLength={100} disabled={disabled || isSubmitting} />
        </label>
        <label>
          Title
          <input className="control" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} disabled={disabled || isSubmitting} />
          <span className="muted">Maximum 200 characters.</span>
        </label>
        <label>
          Description
          <textarea className="control" name="description" value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={5000} rows={5} disabled={disabled || isSubmitting} />
          <span className="muted">Include the context needed for analysis. Maximum 5,000 characters.</span>
        </label>
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" primary disabled={disabled || isSubmitting}>{isSubmitting ? 'Ingesting…' : 'Submit item'}</Button>
          <Button type="button" onClick={onCancel} disabled={disabled || isSubmitting}>Cancel</Button>
        </div>
        {isSubmitting && <p className="muted" role="status">Ingesting item. Please wait.</p>}
      </form>
    </div>
  )
}
