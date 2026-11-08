// Newsletter signup forms that post straight to the owner's provider: a plain HTML form,
// so the page loads nothing from the provider and needs no JavaScript.

export type SignupProvider = 'buttondown' | 'kit' | 'mailchimp' | 'substack';

export interface SignupForm {
  action: string;
  method: 'post' | 'get';
  /** The name each provider expects for the email field. */
  field: string;
}

export function signupForm(
  provider: SignupProvider,
  account: string | undefined,
  url: string | undefined,
): SignupForm {
  const id = encodeURIComponent(account ?? '');
  switch (provider) {
    case 'buttondown':
      return {
        action: `https://buttondown.com/api/emails/embed-subscribe/${id}`,
        method: 'post',
        field: 'email',
      };
    case 'kit':
      return {
        action: `https://app.kit.com/forms/${id}/subscriptions`,
        method: 'post',
        field: 'email_address',
      };
    case 'mailchimp':
      return { action: url ?? '', method: 'post', field: 'EMAIL' };
    case 'substack':
      // Opens the publication's subscribe page with the email filled in, one tap from done.
      return { action: `https://${id}.substack.com/subscribe`, method: 'get', field: 'email' };
  }
}
