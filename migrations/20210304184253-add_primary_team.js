module.exports = {
  async up(db) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    const users = await db.collection('users').find({}).toArray();
    const calls = users.map((u) => {
      return db.collection('users')
        .updateOne({
          _id: u._id,
        }, {
          $set: {
            team: u.teams[0] ?? null,
          }
        });
    });
    await Promise.all(calls);
  },

  async down(db) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    await db.collection('users')
      .updateMany({}, {
        $unset: {
          team: ''
        },
      });
  }
};
