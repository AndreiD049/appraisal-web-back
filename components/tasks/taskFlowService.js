const UserService = require("../../services/UserService");
const taskDAL = require("./taskDAL");

const TaskFlowService = {
  /**
   * Validates that flow can be seen by the user:
   * This means that:
   * 1. Flow and user have at least one team in common
   * 2. Flow and user's active organization are the same
   * @param {Object} flow 
   * @param {Object} user 
   */
  async validateUserFlow(flow, user) {
    if (!flow || !user) throw new Error('Both flow and user parameters are required');
    // verify organization
    if (String(flow.organizationId) !== String(user.organization?.id)) throw new Error('Flow organization id does not match user\'s active organization');
    // verify team intersection
    const userTeams = user.teams.map((team) => String(team.id));
    const flowTeams = new Set(flow.teams.map((team) => String(team.id)));
    const intersection = userTeams.filter((userTeam) => flowTeams.has(userTeam));
    if (intersection.length === 0) throw new Error('Task flow and User do not have teams in common');
  },

  /**
   * Get all task flows that the user can have access to:
   * This includes all task flows of his teams
   * @param {Object} user 
   */
  async getTaskFlows(user) {
    if (!user.id) throw new Error('User not provided');
    const dbUser = await UserService.getUser(user.id);
    const teams = dbUser.teams.map((team) => team.id);
    return taskDAL.getTaskFlows(teams, dbUser.organization?.id);
  },

  /**
   * Get a single task
   * @param {String} id 
   * @param {Object} user 
   */
  async getTaskFlow(id, user) {
    if (!user.id) throw new Error('User is not valid');
    if (!id) throw new Error('Id is not valid');
    const dbUser = await UserService.getUser(user.id);
    const flow = await taskDAL.getTaskFlow(id);
    if (!flow) throw new Error('Task flow doesn\'t exist');
    await this.validateUserFlow(flow, dbUser);
    return flow;
  },

  /**
   * Create a new task flow provided by the user, data is already validated
   * @param {Object} data 
   * @param {Object} user 
   */
  async createTaskFlow(data, user) {
    if (!user.id) throw new Error('User is not valid');
    const dbUser = await UserService.getUser(user.id);
    return taskDAL.createTaskFlow({
      ...data,
      createdUser: dbUser.id,
      organizationId: dbUser.organization?.id,
    });
  },

  /**
   * Update a task flow by id
   * id and data are already validated
   * @param {String} id 
   * @param {Object} data 
   * @param {Object} user 
   */
  async updateTaskFlow(id, data, user) {
    const flow = await taskDAL.getTaskFlow(id, user);
    const dbUser = await UserService.getUser(user.id);
    await this.validateUserFlow(flow, dbUser);
    return taskDAL.updateTaskFlow(id, data);
  },

};


module.exports = TaskFlowService;