import initApplication from '..';

const app = initApplication();
app.httpServer.then((httpServer) => {
  httpServer.start(process.env.PORT || 5000, () => {
    console.log('Server has been started!');
  });
});
