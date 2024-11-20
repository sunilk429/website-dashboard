const API_BASE_URL = 'https://staging-api.realdevsquad.com';
const SKILL_TREE_BACKEND_BASE_URL =
  'https://services.realdevsquad.com/staging-skilltree/v1';
const puppeteer = require('puppeteer');
const { tags } = require('../../mock-data/tags');
const { levels } = require('../../mock-data/levels');
const { users } = require('../../mock-data/users');
const { STAGING_API_URL } = require('../../mock-data/constants');
const { skills } = require('../../mock-data/skills');

describe('Input box', () => {
  let browser;
  let page;
  jest.setTimeout(60000);

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: ['--incognito', '--disable-web-security'],
      devtools: false,
    });

    // Mock API response setup
    const interceptAPI = async (page) => {
      await page.setRequestInterception(true);
      page.on('request', (interceptedRequest) => {
        const url = interceptedRequest.url();

        const mockResponses = {
          [`${STAGING_API_URL}/levels`]: levels,
          [`${STAGING_API_URL}/users`]: users,
          [`${STAGING_API_URL}/tags`]: tags,
        };

        if (mockResponses[url]) {
          interceptedRequest.respond({
            status: 200,
            contentType: 'application/json',
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(mockResponses[url]),
          });
        } else {
          interceptedRequest.continue();
        }
      });
    };

    // Open a shared page instance and intercept API for all tests
    page = await browser.newPage();
    await interceptAPI(page);
    await page.goto('http://localhost:8000/task');
    await page.waitForNetworkIdle();
  });

  afterAll(async () => {
    await browser.close();
  });

  // Form Presence Tests
  describe('Form Field Presence', () => {
    it('should display the title field', async () => {
      const titleField = await page.$('[data-testid="title"]');
      expect(titleField).toBeTruthy();
    });

    it('should display the status field', async () => {
      const statusField = await page.$('[data-testid="status"]');
      expect(statusField).toBeTruthy();
    });

    it('should display the priority field', async () => {
      const priorityField = await page.$('[data-testid="priority"]');
      expect(priorityField).toBeTruthy();
    });

    it('should display the isNoteworthy checkbox', async () => {
      const noteworthyField = await page.$('[data-testid="isNoteworthy"]');
      expect(noteworthyField).toBeTruthy();
    });

    it('should display the purpose field', async () => {
      const purposeField = await page.$('[data-testid="purpose"]');
      expect(purposeField).toBeTruthy();
    });

    it('should display the dependsOn field', async () => {
      const dependsOnField = await page.$('[data-testid="dependsOn"]');
      expect(dependsOnField).toBeTruthy();
    });
  });

  // Status Field Behavior Tests
  describe('Status Field Behavior', () => {
    beforeEach(async () => {
      await page.goto('http://localhost:8000/task');
      await page.waitForNetworkIdle();
    });

    it('should have default status as "available"', async () => {
      const defaultStatus = await page.$eval(
        '[data-testid="status"] select',
        (el) => el.value,
      );
      expect(defaultStatus).toBe('AVAILABLE');
    });

    it('should show/hide fields based on "status" selection', async () => {
      // Change status to "assigned"
      await page.select('[data-testid="status"] select', 'ASSIGNED');

      const assigneeVisible = await page.$eval(
        '[data-testid="assignee"]',
        (el) => window.getComputedStyle(el).display !== 'none',
      );
      const endsOnVisible = await page.$eval(
        '[data-testid="endsOn"]',
        (el) => window.getComputedStyle(el).display !== 'none',
      );
      expect(assigneeVisible).toBeTruthy();
      expect(endsOnVisible).toBeTruthy();

      // Change status back to "available"
      await page.select('[data-testid="status"] select', 'available');

      const assigneeHidden = await page.$eval(
        '[data-testid="assignee"]',
        (el) => window.getComputedStyle(el).display === 'none',
      );
      const endsOnHidden = await page.$eval(
        '[data-testid="endsOn"]',
        (el) => window.getComputedStyle(el).display === 'none',
      );
      expect(assigneeHidden).toBeTruthy();
      expect(endsOnHidden).toBeTruthy();
    });
  });

  // Dev Mode Tests
  describe('Dev Mode Behavior', () => {
    beforeAll(async () => {
      await page.goto('http://localhost:8000/task?dev=true');
      await page.waitForNetworkIdle();
    });

    it('should hide feature URL field in dev mode', async () => {
      const featureUrlField = await page.$('[data-testid="featureUrl"]');
      const display = await page.$eval(
        '[data-testid="featureUrl"]',
        (el) => window.getComputedStyle(el).display,
      );
      expect(display).toBe('none');
    });

    it('should hide task level field in dev mode', async () => {
      const taskLevelField = await page.$('[data-testid="taskLevel"]');
      const display = await page.$eval(
        '[data-testid="taskLevel"]',
        (el) => window.getComputedStyle(el).display,
      );
      expect(display).toBe('none');
    });

    it('should hide feature/group radio buttons in dev mode', async () => {
      const radioButtons = await page.$('[data-testid="radioButtons"]');
      const display = await page.$eval(
        '[data-testid="radioButtons"]',
        (el) => window.getComputedStyle(el).display,
      );
      expect(display).toBe('none');
    });

    it('should display the dependsOn field in dev mode', async () => {
      const dependsOnField = await page.$('[data-testid="dependsOn"]');
      expect(dependsOnField).toBeTruthy();
    });
    it('should show skills multi-select component', async () => {
      const skillsComponent = await page.$eval(
        '[data-testid="skills"] .multi-select-container',
        (el) =>
          window.getComputedStyle(el.closest('[data-testid="skills"]')).display,
      );
      expect(skillsComponent).not.toBe('none');
    });

    it('should initialize skills multi-select with options', async () => {
      await page.waitForSelector('[data-testid="skills-multi-select"]');

      // Click to open dropdown
      await page.click('[data-testid="skills-select-button"]');

      // Check if options are loaded
      const options = await page.$$eval('[data-testid="option"]', (elements) =>
        elements.map((el) => el.textContent.trim()),
      );

      expect(options).toContain('(Select All)');
      expect(options).toContain('JavaScript');
      expect(options).toContain('React');
      expect(options).toContain('Node.js');
    });

    it('should allow selecting and deselecting skills', async () => {
      await page.waitForSelector('[data-testid="skills-multi-select"]');

      // Open dropdown
      await page.click('[data-testid="skills-select-button"]');

      // Select a skill
      await page.click('[data-testid="option"][data-value="1"]');

      // Check if badge is created
      const badge = await page.$eval(
        '[data-testid="badge"] .text',
        (el) => el.textContent,
      );
      expect(badge).toBe('JavaScript');

      // Remove skill
      await page.click('[data-testid="badge"] .remove');

      // Check if badge is removed
      const badges = await page.$$('.badge');
      expect(badges.length).toBe(0);
    });

    it('should filter options based on search input', async () => {
      await page.waitForSelector('[data-testid="skills-multi-select"]');

      // Open dropdown
      await page.click('[data-testid="skills-select-button"]');

      // Enter a search term
      await page.type('[data-testid="search-input"]', 'React');

      // Verify only matching options are shown
      const options = await page.$$eval('[data-testid="option"]', (elements) =>
        elements.map((el) => el.textContent.trim()),
      );

      expect(options).toEqual(['React']);
    });

    it('should allow selecting all skills with (Select All)', async () => {
      await page.waitForSelector('[data-testid="skills-multi-select"]');

      // Open dropdown
      await page.click('[data-testid="skills-select-button"]');

      // Click (Select All)
      await page.click('[data-testid="option"][data-value="select-all"]');

      // Check if all skills are selected as badges
      const badges = await page.$$eval('[data-testid="badge"]', (elements) =>
        elements.map((el) => el.textContent.trim()),
      );
      expect(badges).toEqual(['JavaScript', 'React', 'Node.js']);
    });

    it('should allow navigating and selecting options using the keyboard', async () => {
      await page.waitForSelector('[data-testid="skills-multi-select"]');

      // Focus on the multi-select button
      await page.focus('[data-testid="skills-select-button"]');

      // Open the dropdown using Enter key
      await page.keyboard.press('Enter');

      // Navigate and select an option using Arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Verify badge is created
      const badge = await page.$eval(
        '[data-testid="badge-text"]',
        (el) => el.textContent,
      );
      expect(badge).toBe('JavaScript');
    });
  });
});
