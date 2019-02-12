/**
 * Created by Awesome on 1/30/2016.
 */

// use strict


// Require dependencies
const Grid        = require('grid');
const config      = require('config');
const Controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const Block = model('block');
const Audit = model('audit');

// require helpers
const formHelper  = helper('form');
const fieldHelper = helper('form/field');
const blockHelper = helper('cms/block');

/**
 * Build audit controller
 *
 * @acl   admin
 * @fail  next
 * @mount /admin/audit
 */
class AuditAdminController extends Controller {
  /**
   * Construct user auditAdminController controller
   */
  constructor() {
    // Run super
    super();

    // Bind methods
    this.gridAction = this.gridAction.bind(this);
    this.indexAction = this.indexAction.bind(this);
    this.updateAction = this.updateAction.bind(this);
    this.removeAction = this.removeAction.bind(this);
    this.updateSubmitAction = this.updateSubmitAction.bind(this);
    this.removeSubmitAction = this.removeSubmitAction.bind(this);

    // Bind private methods
    this._grid = this._grid.bind(this);

    // register simple block
    blockHelper.block('audit.grid', {
      acl         : ['admin.audit'],
      for         : ['admin'],
      title       : 'Audit Grid',
      description : 'Ausit grid',
    }, async (req, block) => {
      // get notes block from db
      const blockModel = await Block.findOne({
        uuid : block.uuid,
      }) || new Block({
        uuid : block.uuid,
        type : block.type,
      });

      // create new req
      const fauxReq = {
        query : blockModel.get('state') || {},
      };

      // return
      return {
        tag   : 'grid',
        name  : 'Audits',
        grid  : await this._grid(req).render(fauxReq),
        class : blockModel.get('class') || null,
        title : blockModel.get('title') || '',
      };
    }, async (req, block) => {
      // get notes block from db
      const blockModel = await Block.findOne({
        uuid : block.uuid,
      }) || new Block({
        uuid : block.uuid,
        type : block.type,
      });

      // set data
      blockModel.set('class', req.body.data.class);
      blockModel.set('state', req.body.data.state);
      blockModel.set('title', req.body.data.title);

      // save block
      await blockModel.save(req.user);
    });
  }

  /**
   * Index action
   *
   * @param {Request}  req
   * @param {Response} res
   *
   * @icon     fa fa-file-medical
   * @menu     {ADMIN} Audits
   * @title    Audit Administration
   * @route    {get} /
   * @layout   admin
   * @priority 10
   */
  async indexAction(req, res) {
    // Render grid
    res.render('audit/admin', {
      grid : await this._grid(req).render(req),
    });
  }

  /**
   * Update action
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @route   {get} /:id/update
   * @layout  admin
   */
  async updateAction(req, res, next) {
    // Set website variable
    let audit = null;
    let create = true;

    // Check for website model
    if (req.params.id) {
      // Load by id
      audit = await Audit.findById(req.params.id);
      create = false;
    }

    // create audit
    if (!audit) return next();

    // get form
    const form = await formHelper.get('edenjs.audit');

    // digest into form
    const sanitised = await formHelper.render(req, form, await Promise.all(form.get('fields').map(async (field) => {
      // return fields map
      return {
        uuid  : field.uuid,
        value : await audit.get(field.name || field.uuid),
      };
    })));

    // get form
    if (!form.get('_id')) res.form('edenjs.audit');

    // Render page
    res.render('audit/admin/update', {
      item   : await audit.sanitise(),
      form   : sanitised,
      title  : `Update ${audit.get('_id').toString()}`,
      fields : config.get('audit.fields').slice(0).map((field) => {
        // delete field stuff
        delete field.format;
        delete field.filter;

        // return field
        return field;
      }),
    });
  }

  /**
   * Add/edit action
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @route   {post} /:id/update
   * @layout  admin
   */
  async updateSubmitAction(req, res, next) {
    // Set website variable
    let audit = new Audit();
    let create = true;

    // Check for website model
    if (req.params.id) {
      // Load by id
      audit = await Audit.findById(req.params.id);
      create = false;
    }

    // create audit
    if (!audit) return next();

    // get form
    const form = await formHelper.get('edenjs.audit');

    // digest into form
    const fields = await formHelper.submit(req, form, await Promise.all(form.get('fields').map(async (field) => {
      // return fields map
      return {
        uuid  : field.uuid,
        value : await audit.get(field.name || field.uuid),
      };
    })));

    // loop fields
    for (const field of fields) {
      // set value
      audit.set(field.name || field.uuid, field.value);
    }

    // Save audit
    await audit.save(req.user);

    // set id
    req.params.id = audit.get('_id').toString();

    // return update action
    return this.updateAction(req, res, next);
  }

  /**
   * Delete action
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @route   {get} /:id/remove
   * @layout  admin
   */
  async removeAction(req, res, next) {
    // Set website variable
    let audit = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      audit = await Audit.findById(req.params.id);
    }

    // create audit
    if (!audit) return next();

    // Render page
    res.render('audit/admin/remove', {
      item  : await audit.sanitise(),
      title : `Remove ${audit.get('_id').toString()}`,
    });
  }

  /**
   * Delete action
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @route   {post} /:id/remove
   * @title   Remove Audit
   * @layout  admin
   */
  async removeSubmitAction(req, res, next) {
    // Set website variable
    let audit = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      audit = await Audit.findById(req.params.id);
    }

    // create audit
    if (!audit) return next();

    // Alert Removed
    req.alert('success', `Successfully removed ${audit.get('_id').toString()}`);

    // Delete website
    await audit.remove(req.user);

    // Render index
    return this.indexAction(req, res);
  }

  /**
   * User grid action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route  {post} /grid
   * @return {*}
   */
  gridAction(req, res) {
    // Return post grid request
    return this._grid(req).post(req, res);
  }

  /**
   * Renders grid
   *
   * @param {Request} req
   *
   * @return {grid}
   */
  _grid(req) {
    // Create new grid
    const auditGrid = new Grid(req);

    // Set route
    auditGrid.route('/admin/audit/grid');

    // Set grid model
    auditGrid.model(Audit);

    // Add grid columns
    auditGrid.column('_id', {
      sort   : true,
      title  : 'Id',
      format : (col) => {
        return col ? col.toString() : '<i>N/A</i>';
      },
    });

    // audit fields
    config.get('audit.fields').slice(0).filter(field => field.grid).forEach((field) => {
      // add config field
      auditGrid.column(field.name, {
        sort   : true,
        title  : field.label,
        format : field.format ? field.format : (col) => {
          return col ? col.toString() : '<i>N/A</i>';
        },
      });
    });

    auditGrid.column('updated_at', {
      sort   : true,
      title  : 'Updated',
      format : (col) => {
        return col.toLocaleDateString('en-GB', {
          day   : 'numeric',
          month : 'short',
          year  : 'numeric',
        });
      },
    }).column('created_at', {
      sort   : true,
      title  : 'Created',
      format : (col) => {
        return col.toLocaleDateString('en-GB', {
          day   : 'numeric',
          month : 'short',
          year  : 'numeric',
        });
      },
    })
      .column('actions', {
        type   : false,
        width  : '1%',
        title  : 'Actions',
        format : (col, row) => {
          return [
            '<div class="btn-group btn-group-sm" role="group">',
            `<a href="/admin/audit/${row.get('_id').toString()}/update" class="btn btn-primary"><i class="fa fa-pencil"></i></a>`,
            `<a href="/admin/audit/${row.get('_id').toString()}/remove" class="btn btn-danger"><i class="fa fa-times"></i></a>`,
            '</div>',
          ].join('');
        },
      });

    // audit filters
    config.get('audit.fields').slice(0).filter(field => field.grid).forEach((field) => {
      // add config field
      auditGrid.filter(field.name, {
        type  : 'text',
        title : field.label,
        query : field.filter ? (param) => {
          // return filter
          return field.filter(param, auditGrid);
        } : (param) => {
          // Another where
          auditGrid.match(field.name, new RegExp(escapeRegex(param.toString().toLowerCase()), 'i'));
        },
      });
    });

    // Set default sort order
    auditGrid.sort('created_at', 1);

    // Return grid
    return auditGrid;
  }
}

/**
 * Export audit controller
 *
 * @type {AuditAdminController}
 */
module.exports = AuditAdminController;
