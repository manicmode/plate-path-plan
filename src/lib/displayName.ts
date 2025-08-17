export type NameLike = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  user_id?: string | null;
};

export function getDisplayName(x: NameLike): string {
  const dn = (x.display_name ?? '').trim();
  if (dn) return dn;

  const first = (x.first_name ?? '').trim();
  const last = (x.last_name ?? '').trim();
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;

  const email = (x.email ?? '').trim();
  if (email) return email.split('@')[0];

  const id = (x.user_id ?? '').trim();
  if (id) return `User ${id.slice(0, 8)}`;

  return 'User';
}