import { getTranslations } from 'next-intl/server';
import { Btn } from '@/components/ui';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '120px 28px', textAlign: 'center' }}>
      <h1 className="serif" style={{ fontSize: 'clamp(40px,7vw,72px)', margin: '0 0 12px', lineHeight: 1 }}>
        {t('title')}
      </h1>
      <p style={{ color: 'var(--dim)', fontSize: 17, margin: '0 0 28px' }}>
        {t('body')}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Btn href="/" variant="soft" size="lg">
          {t('backHome')}
        </Btn>
        <Btn href="/browse" size="lg" iconR="arrow">
          {t('browseEvents')}
        </Btn>
      </div>
    </div>
  );
}
