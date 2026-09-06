export class AiProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = AiProviderError.name;
  }
}

export class AiInvalidResponseError extends AiProviderError {
  constructor(options?: ErrorOptions) {
    super('AI returned an invalid analysis. Please retry.', options);
    this.name = AiInvalidResponseError.name;
  }
}
