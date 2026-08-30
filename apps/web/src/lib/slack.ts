import { API } from './api';

document.addEventListener('click', (event) => {
  const element = event.target as Element;
  const link = element.closest('a[data-slack-connect]') as HTMLAnchorElement | null;
  const session = localStorage.getItem('reachinbox_token');
  if (link && session) {
    link.href = `${API}/integrations/slack/connect?token=${encodeURIComponent(session)}`;
  }
});
