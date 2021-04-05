module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    const teams = await db.collection('teams').find({}).toArray();
    const organization = await db.collection('organizations').findOne({});
    const calls = teams.map((t) => {
      return db.collection('teams')
        .updateOne({
          _id: t._id,
        }, {
          $set: {
            organizationId: organization._id,
          },
        });
    });
    await Promise.all(calls);
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    await db.collection('teams')
      .updateMany({}, {
        $unset: {
          organizationId: ''
        },
      });
  }
};
