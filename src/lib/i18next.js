import i18next from 'i18next';
import Backend from 'i18next-node-fs-backend';
import path from 'path';

export default async () => {
  await i18next.use(Backend).init({
    backend: {
      loadPath: path.resolve(__dirname, '..', '..', 'locales/{{lng}}/{{ns}}.yml'),
      addPath: path.resolve(__dirname, '..', '..', 'locales/{{lng}}/{{ns}}.missing.yml'),
    },
    lng: 'ru-RU',
    ns: ['validation', 'page-titles', 'flash-messages', 'common'],
  });

  return i18next;
};
