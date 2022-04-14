// Определяем переменную "preprocessor"
let preprocessor = 'scss'; // Выбор препроцессора в проекте - sass или less

// Определяем константы Gulp
const { src, dest, parallel, series, watch } = require('gulp');
 
// Подключаем Browsersync
const browserSync = require('browser-sync').create();

// Подключаем gulp-concat
const concat = require('gulp-concat');
 
// Подключаем gulp-uglify-es
const uglify = require('gulp-uglify-es').default;

// Подключаем модули gulp-sass и gulp-less
const sass = require('gulp-sass')(require('sass'));
 
// Подключаем Autoprefixer
const autoprefixer = require('gulp-autoprefixer');
 
// Подключаем модуль gulp-clean-css
const cleancss = require('gulp-clean-css');

// Подключаем compress-images для работы с изображениями
const imagecomp = require('compress-images');
 
// Подключаем модуль del
const del = require('del');

let project_folder = "build";
let source_folder = "src";


let path = {
	src: {
		html: source_folder + "/**/*.{html, htm}",
		/* includes: {
			header: source_folder + "/includes/header.html",
			footer: source_folder + "/includes/footer.html"
		}, */
		css: [source_folder + "/css/*.css", "!"+source_folder + "/css/*.min.css"],
		js: source_folder + "/js/src.js",
		img: {
			src: source_folder + "/images/src/*",
			dest: source_folder + "/images/dest/"
		},
		scss: source_folder + "/scss/*.scss",
		min: {
			css: source_folder + "/css/*.min.css",
			js: source_folder + "/js/*.min.js"
		}
	},
	build: {
		html: project_folder + "/",
		css:  project_folder + "/css/",
		js:   project_folder + "/js/",
		img:  project_folder + "/images/dest/"
	}
};

//подключаем gulp-file-include
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');

// Определяем логику работы Browsersync
function browsersync() {
	browserSync.init({ // Инициализация Browsersync
		server: { baseDir: project_folder }, // Указываем папку сервера
		notify: false, // Отключаем уведомления
		online: true // Режим работы: true или false
	})
};

//Создадим функцию scripts() для экспорта задач
function scripts() {
	return src([ // Берем файлы из источников
		'node_modules/jquery/dist/jquery.min.js', // Пример подключения библиотеки
		path.src.js // Пользовательские скрипты, использующие библиотеку, должны быть подключены в конце
	])
	.pipe(concat('src.min.js')) // Конкатенируем в один файл
	.pipe(uglify()) // Сжимаем JavaScript
	.pipe(dest(source_folder+'/js/')) // Выгружаем готовый файл в папку назначения
	.pipe(browserSync.stream()) // Триггерим Browsersync для обновления страницы
}

//обработка стилей
function styles() {
	return src('src/' + preprocessor + '/main.' + preprocessor + '') // Выбираем источник: "src/scss/main.scss"
	.pipe(eval('sass')()) // Преобразуем значение переменной "preprocessor" в функцию
	.pipe(concat('src.min.css')) // Конкатенируем в файл src.min.css
	.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true })) // Создадим префиксы с помощью Autoprefixer
	.pipe(cleancss( { level: { 1: { specialComments: 0 } }/* , format: 'beautify' */ } )) // Минифицируем стили
	.pipe(dest(path.build.css)) // Выгрузим результат в папку "build/css/"
	.pipe(browserSync.stream()) // Сделаем инъекцию в браузер
}

//обработка изображений
async function images() {
	imagecomp(
		path.src.img.src, // Берём все изображения из папки источника
		path.src.img.dest, // Выгружаем оптимизированные изображения в папку назначения
		{ compress_force: false, statistic: true, autoupdate: true }, false, // Настраиваем основные параметры
		{ jpg: { engine: "mozjpeg", command: ["-quality", "75"] } }, // Сжимаем и оптимизируем изображеня
		{ png: { engine: "pngquant", command: ["--quality=75-100", "-o"] } },
		{ svg: { engine: "svgo", command: "--multipass" } },
		{ gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
		function (err, completed) { // Обновляем страницу по завершению
			if (completed === true) {
				browserSync.reload()
			}
		}
	)
}

//функция сборки проекта
function buildcopy() {
	return src([ // Выбираем нужные файлы
		path.src.min.css,
		path.src.min.js,
		path.src.img.dest+"*",
		], { base: source_folder }) // Параметр "base" сохраняет структуру проекта при копировании
	.pipe(dest(project_folder)) // Выгружаем в папку с финальной сборкой
}

//функция очистки папки dest
function cleanimg() {
	return del(path.src.img.dest, { force: true }) // Удаляем все содержимое папки "app/images/dest/"
}

//функция очистки папки собранного файла
function cleandist() {
	return del(project_folder+'/**/*', { force: true }) // Удаляем все содержимое папки "dist/"
}

function html(){
	return src(path.src.html)
		.pipe(fileinclude({
			prefix: '@@',
			basepath: '@file'
		  }))
		.pipe(dest(project_folder))
		.pipe(browserSync.stream())
}

//при сохранении скриптов, происходит автоматическое обновление страницы в браузере
function startwatch() {
 
	// Выбираем все файлы JS в проекте, а затем исключим с суффиксом .min.js
	watch([path.src.js], scripts);

	// Мониторим файлы препроцессора на изменения
	watch(source_folder+'/**/' + preprocessor + '/**/*', styles);

	// Мониторим файлы HTML на изменения
	watch(path.src.html).on('change', browserSync.reload);

	// Мониторим папку-источник изображений и выполняем images(), если есть изменения
	watch(path.src.img.src, images);
}

// Экспортируем функцию browsersync() как таск browsersync. Значение после знака = это имеющаяся функция.
exports.browsersync = browsersync;

// Экспортируем функцию scripts() в таск scripts
exports.scripts = scripts;

// Экспортируем функцию styles() в таск styles
exports.styles = styles;

// Экспорт функции images() в таск images
exports.images = images;

// Экспортируем функцию cleanimg() как таск cleanimg
exports.cleanimg = cleanimg;

exports.html = html;


// Создаем новый таск "build", который последовательно выполняет нужные операции
exports.build = series(cleandist, html, styles, scripts, images, buildcopy);

// Экспортируем дефолтный таск с нужным набором функций
exports.default = series( 
	parallel(
	  styles, 
	  html, 
	  scripts
	), 
	parallel(
	  browsersync,
	  startwatch
	)
  );