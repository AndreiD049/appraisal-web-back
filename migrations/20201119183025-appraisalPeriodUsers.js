/**
 * Migrate appraisalperiods collection, field users to the new variant
 */
module.exports = {
  async up(db) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'},
    // {$set: {blacklisted: true}});
    const periods = await db.collection('appraisalperiods').find({}).toArray();
    periods.forEach((p) => {
      const users = p.users.map((u) => ({ _id: u, locked: false }));
      db.collection('appraisalperiods').updateOne(
        {
          _id: p._id,
        },
        {
          $set: {
            users,
          },
        },
      );
    });
  },

  async down(db) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    const periods = await db.collection('appraisalperiods').find({}).toArray();
    periods.forEach((p) => {
      const users = p.users.map((u) => u._id);
      db.collection('appraisalperiods').updateOne(
        {
          _id: p._id,
        },
        {
          $set: {
            users,
          },
        },
      );
    });
  },
};
