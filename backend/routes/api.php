<?php
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\StoreSettingController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AdminProductImageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdminCustomerController;
Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    /*
    |--------------------------------------------------------------------------
    | Authenticated Routes
    |--------------------------------------------------------------------------
    */

    Route::middleware('auth:sanctum')->group(function () {

        // Authentication

        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'update']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Orders

        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{orderNumber}', [OrderController::class, 'show']);

        Route::post(
            '/orders/{orderNumber}/cancel',
            [OrderController::class, 'cancel']
        );

        Route::delete(
            '/orders/{orderNumber}',
            [OrderController::class, 'destroy']
        );

        Route::post(
            '/orders/{orderNumber}/pay',
            [OrderController::class, 'pay']
        );

        /*
        |--------------------------------------------------------------------------
        | Admin Routes
        |--------------------------------------------------------------------------
        */

        Route::middleware('admin')->prefix('admin')->group(function () {

        // Customer Management
        Route::post(
    '/customers',
    [AdminCustomerController::class, 'store']
);
Route::delete(
    '/customers/{customerId}',
    [AdminCustomerController::class, 'destroy']
);
Route::get(
    '/customers',
    [AdminCustomerController::class, 'index']
);

Route::get(
    '/customers/{customerId}',
    [AdminCustomerController::class, 'show']
);
            // Dashboard

            Route::get(
                '/dashboard',
                [AdminController::class, 'dashboard']
            );

            // Category Management

            Route::get(
                '/categories',
                [AdminCategoryController::class, 'index']
            );

            Route::post(
                '/categories',
                [AdminCategoryController::class, 'store']
            );

            Route::get(
                '/categories/{category}',
                [AdminCategoryController::class, 'show']
            );

            Route::put(
                '/categories/{category}',
                [AdminCategoryController::class, 'update']
            );

            Route::patch(
                '/categories/{category}/status',
                [AdminCategoryController::class, 'updateStatus']
            );

            Route::delete(
                '/categories/{category}',
                [AdminCategoryController::class, 'destroy']
            );

            // Product Management

           Route::get(
    '/products',
    [AdminProductController::class, 'index']
);

            Route::post(
                '/products',
                [AdminProductController::class, 'store']
            );

            Route::get(
                '/products/{product}',
                [AdminProductController::class, 'show']
            );

            Route::put(
                '/products/{product}',
                [AdminProductController::class, 'update']
            );

            Route::patch(
                '/products/{product}/status',
                [AdminProductController::class, 'updateStatus']
            );

            Route::delete(
                '/products/{product}',
                [AdminProductController::class, 'destroy']
            );

            // Product Image Management

            Route::post(
                '/products/{product}/images',
                [AdminProductImageController::class, 'store']
            );

            Route::patch(
                '/products/{product}/images/reorder',
                [AdminProductImageController::class, 'reorder']
            );

            Route::patch(
                '/products/{product}/images/{productImage}/primary',
                [AdminProductImageController::class, 'setPrimary']
            );

            Route::delete(
                '/products/{product}/images/{productImage}',
                [AdminProductImageController::class, 'destroy']
            );
            // Order Management
Route::get(
    '/orders',
    [AdminOrderController::class, 'index']
);

Route::get(
    '/orders/{orderNumber}',
    [AdminOrderController::class, 'show']
);

Route::patch(
    '/orders/{orderNumber}/status',
    [AdminOrderController::class, 'updateStatus']
);
        });
    });
/*
|--------------------------------------------------------------------------
| Public Store Settings
|--------------------------------------------------------------------------
*/

Route::get(
    '/store-settings/tax',
    [StoreSettingController::class, 'tax']
);
    /*
    |--------------------------------------------------------------------------
    | Public Categories
    |--------------------------------------------------------------------------
    */

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | Public Brands
    |--------------------------------------------------------------------------
    */

    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/brands/{slug}', [BrandController::class, 'show']);

 
    /*
    |--------------------------------------------------------------------------
    | Public Products
    |--------------------------------------------------------------------------
    */


    Route::get('/products', [ProductController::class, 'index']);

    Route::get(
        '/products/featured',
        [ProductController::class, 'featured']
    );

    Route::get(
        '/products/newest',
        [ProductController::class, 'newest']
    );

    Route::get('/products/{slug}', [ProductController::class, 'show']);
});