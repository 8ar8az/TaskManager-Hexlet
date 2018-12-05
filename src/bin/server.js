import application from '..';

application.listen(process.env.PORT || 5000, () => {
  console.log('Server has been started!');
});
